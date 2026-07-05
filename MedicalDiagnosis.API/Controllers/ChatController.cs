using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChatController(AppDbContext context)
    {
        _context = context;
    }

    // POST /api/chat/conversations
    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var role = User.FindFirst(ClaimTypes.Role)!.Value;

        if (role == "patient" && req.DoctorId.HasValue)
        {
            bool isAssigned = await _context.ImageAssignments
                .AnyAsync(a => a.DoctorId == req.DoctorId.Value && a.Image!.PatientId == userId);
            if (!isAssigned) return BadRequest(new { message = "Bạn chỉ được tạo cuộc trò chuyện với bác sĩ phụ trách." });
        }

        // Kiểm tra xem đã có cuộc trò chuyện giữa 2 người này chưa
        int? targetUserId = req.DoctorId ?? req.PatientId;
        if (targetUserId.HasValue)
        {
            var existingConvId = await _context.Conversations
                .Where(c => _context.ConversationParticipants.Any(p => p.ConversationId == c.Id && p.UserId == userId) &&
                            _context.ConversationParticipants.Any(p => p.ConversationId == c.Id && p.UserId == targetUserId.Value))
                .OrderByDescending(c => c.Id)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();

            if (existingConvId > 0)
            {
                return Ok(new { message = "Cuộc trò chuyện đã tồn tại", conversationId = existingConvId });
            }
        }

        var conversation = new Conversation { CreatedAt = DateTime.Now };
        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync();

        // Thêm người tạo vào
        _context.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId         = userId,
            Role           = User.FindFirst(ClaimTypes.Role)!.Value
        });

        // Thêm bác sĩ vào nếu có (Dành cho bệnh nhân tạo)
        if (req.DoctorId.HasValue)
        {
            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId         = req.DoctorId.Value,
                Role           = "doctor"
            });
        }

        // Thêm bệnh nhân vào nếu có (Dành cho bác sĩ tạo)
        if (req.PatientId.HasValue)
        {
            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId         = req.PatientId.Value,
                Role           = "patient"
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Tạo cuộc trò chuyện thành công", conversationId = conversation.Id });
    }

    // GET /api/chat/conversations
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Bước 1: Lấy danh sách conversation mà user tham gia (query đơn giản)
        var myConversationIds = await _context.ConversationParticipants
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new { p.ConversationId, p.Conversation!.CreatedAt, p.IsArchived })
            .ToListAsync();

        if (!myConversationIds.Any())
            return Ok(new List<object>());

        var convIds = myConversationIds.Select(c => c.ConversationId).ToList();

        // Bước 2: Lấy tất cả participants của các conversations đó (1 query)
        var allParticipants = await _context.ConversationParticipants
            .AsNoTracking()
            .Where(cp => convIds.Contains(cp.ConversationId))
            .Select(cp => new
            {
                cp.ConversationId,
                cp.UserId,
                FullName = cp.User!.FullName,
                cp.Role
            })
            .ToListAsync();

        // Bước 3: Lấy last message của mỗi conversation (1 query)
        var lastMessages = await _context.Messages
            .AsNoTracking()
            .Where(m => convIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => new
            {
                ConversationId = g.Key,
                Content    = g.OrderByDescending(m => m.CreatedAt).First().Content,
                CreatedAt  = g.OrderByDescending(m => m.CreatedAt).First().CreatedAt,
                SenderType = g.OrderByDescending(m => m.CreatedAt).First().SenderType
            })
            .ToListAsync();

        // Bước 4: Lấy số lượng tin nhắn chưa đọc (1 query)
        var unreadCounts = await _context.Messages
            .AsNoTracking()
            .Where(m => convIds.Contains(m.ConversationId) && !m.IsRead && (m.SenderId != userId || m.SenderId == null))
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToListAsync();

        // Bước 5: Ghép kết quả trong memory (cực nhanh) và sắp xếp
        var result = myConversationIds.Select(c => new
        {
            Id          = c.ConversationId,
            c.CreatedAt,
            c.IsArchived,
            Participants = allParticipants
                .Where(p => p.ConversationId == c.ConversationId)
                .Select(p => new { p.UserId, p.FullName, p.Role })
                .ToList(),
            LastMessage = lastMessages.FirstOrDefault(m => m.ConversationId == c.ConversationId),
            UnreadCount = unreadCounts.FirstOrDefault(u => u.ConversationId == c.ConversationId)?.Count ?? 0
        })
        .OrderByDescending(c => c.LastMessage?.CreatedAt ?? c.CreatedAt)
        .ToList();

        return Ok(result);
    }

    // PATCH /api/chat/conversations/{id}/archive
    [HttpPatch("conversations/{id}/archive")]
    public async Task<IActionResult> ArchiveConversation(int id, [FromQuery] bool isArchived = true)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == id && p.UserId == userId);

        if (participant == null) return NotFound();

        participant.IsArchived = isArchived;
        await _context.SaveChangesAsync();

        return Ok(new { message = isArchived ? "Đã lưu trữ" : "Đã bỏ lưu trữ" });
    }

    // POST /api/chat/messages
    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        if (string.IsNullOrWhiteSpace(req.Content))
            return BadRequest(new { message = "Tin nhắn không được để trống" });

        var content = req.Content.Trim();
        if (content.Length > 1000)
            return BadRequest(new { message = "Tin nhắn không được vượt quá 1000 ký tự" });

        // Kiểm tra user có trong conversation không
        var inConversation = await _context.ConversationParticipants
            .AnyAsync(p => p.ConversationId == req.ConversationId && p.UserId == userId);
        if (!inConversation) return Forbid();

        // Lưu tin nhắn của user
        var message = new Message
        {
            ConversationId = req.ConversationId,
            SenderId       = userId,
            SenderType     = "user",
            Content        = content,
            ImageId        = req.ImageId,
            IsRead         = false,
            IsAiGenerated  = false,
            CreatedAt      = DateTime.Now
        };
        _context.Messages.Add(message);

        // Hồi sinh cuộc trò chuyện (un-archive) cho người nhận
        var otherParticipants = await _context.ConversationParticipants
            .Where(p => p.ConversationId == req.ConversationId && p.UserId != userId)
            .ToListAsync();
        foreach (var p in otherParticipants)
        {
            p.IsArchived = false;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Gửi thành công", messageId = message.Id });
    }

    // GET /api/chat/messages/{conversationId}
    [HttpGet("messages/{conversationId}")]
    public async Task<IActionResult> GetMessages(int conversationId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var inConversation = await _context.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        if (!inConversation) return Forbid();

        var messages = await _context.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                m.Content,
                m.SenderType,
                m.IsAiGenerated,
                m.IsRead,
                m.CreatedAt,
                m.ImageId,
                SenderName = m.SenderId == null ? "AI" : m.Sender!.FullName
            })
            .ToListAsync();

        // Đánh dấu đã đọc
        await _context.Messages
            .Where(m => m.ConversationId == conversationId && !m.IsRead && (m.SenderId != userId || m.SenderId == null))
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));

        return Ok(messages);
    }

    // GET /api/chat/conversations/{id}/ai-draft
    [HttpGet("conversations/{id}/ai-draft")]
    public async Task<IActionResult> GetAiDraft(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Kiểm tra quyền
        var inConversation = await _context.ConversationParticipants
            .AnyAsync(p => p.ConversationId == id && p.UserId == userId);
        if (!inConversation) return Forbid();

        var history = await _context.Messages
            .Where(m => m.ConversationId == id)
            .OrderByDescending(m => m.CreatedAt)
            .Take(15)
            .ToListAsync();
            
        history.Reverse();

        var payloadHistory = new List<object>();
        foreach (var m in history)
        {
            // Bỏ qua các tin nhắn tự động của con Bot cũ để không làm rác ngữ cảnh của Gemini
            if (m.IsAiGenerated || m.SenderType == "ai") continue;

            string text = m.Content ?? "";
            if (m.ImageId.HasValue)
            {
                var aiRes = await _context.AiChatResponses.OrderByDescending(r => r.CreatedAt).FirstOrDefaultAsync(r => r.ImageId == m.ImageId.Value);
                if (aiRes != null)
                {
                    text += $"\n[Hệ thống: Bệnh nhân vừa gửi ảnh X-quang. Kết quả AI nhận diện: {aiRes.MessageContent}]";
                }
            }
            payloadHistory.Add(new {
                role = m.IsAiGenerated || m.SenderType == "doctor" || m.SenderType == "ai" ? "ai" : "user",
                content = text
            });
        }

        var payload = new { history = payloadHistory };

        using var httpClient = new HttpClient();
        try
        {
            var response = await httpClient.PostAsJsonAsync("http://localhost:8000/ai/chat/reply", payload);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<AiReplyResponse>();
                return Ok(new { draft = result?.Reply ?? "" });
            }
            return StatusCode(500, new { message = "Lỗi từ AI Service." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Không kết nối được AI Service: {ex.Message}" });
        }
    }
}

public class CreateConversationRequest
{
    public int? DoctorId { get; set; }
    public int? PatientId { get; set; }
}

public class SendMessageRequest
{
    public int     ConversationId { get; set; }
    public string  Content        { get; set; } = null!;
    public int?    ImageId        { get; set; }
}

public class AiReplyResponse
{
    public string Reply { get; set; } = null!;
}
