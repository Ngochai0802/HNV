using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        // Thêm bác sĩ vào nếu có
        if (req.DoctorId.HasValue)
        {
            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId         = req.DoctorId.Value,
                Role           = "doctor"
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
            .Select(p => new { p.ConversationId, p.Conversation!.CreatedAt })
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

        // Bước 4: Ghép kết quả trong memory (cực nhanh)
        var result = myConversationIds.Select(c => new
        {
            Id          = c.ConversationId,
            c.CreatedAt,
            Participants = allParticipants
                .Where(p => p.ConversationId == c.ConversationId)
                .Select(p => new { p.UserId, p.FullName, p.Role })
                .ToList(),
            LastMessage = lastMessages.FirstOrDefault(m => m.ConversationId == c.ConversationId)
        }).ToList();

        return Ok(result);
    }


    // POST /api/chat/messages
    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

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
            Content        = req.Content,
            ImageId        = req.ImageId,
            IsRead         = false,
            IsAiGenerated  = false,
            CreatedAt      = DateTime.Now
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Nếu có imageId → AI tự động trả lời
        if (req.ImageId.HasValue)
        {
            var aiResponse = await _context.AiChatResponses
                .Where(r => r.ImageId == req.ImageId.Value)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (aiResponse != null)
            {
                _context.Messages.Add(new Message
                {
                    ConversationId = req.ConversationId,
                    SenderId       = null,
                    SenderType     = "ai",
                    Content        = aiResponse.MessageContent,
                    IsRead         = false,
                    IsAiGenerated  = true,
                    CreatedAt      = DateTime.Now.AddSeconds(1)
                });
                await _context.SaveChangesAsync();
            }
        }

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
        var unread = await _context.Messages
            .Where(m => m.ConversationId == conversationId && !m.IsRead && m.SenderId != userId)
            .ToListAsync();
        unread.ForEach(m => m.IsRead = true);
        await _context.SaveChangesAsync();

        return Ok(messages);
    }
}

public class CreateConversationRequest
{
    public int? DoctorId { get; set; }
}

public class SendMessageRequest
{
    public int     ConversationId { get; set; }
    public string  Content        { get; set; } = null!;
    public int?    ImageId        { get; set; }
}