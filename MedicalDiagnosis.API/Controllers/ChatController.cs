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

        var conversations = await _context.ConversationParticipants
            .Where(p => p.UserId == userId)
            .Include(p => p.Conversation)
            .Select(p => new
            {
                p.Conversation!.Id,
                p.Conversation.CreatedAt,
                Participants = _context.ConversationParticipants
                    .Where(cp => cp.ConversationId == p.ConversationId)
                    .Include(cp => cp.User)
                    .Select(cp => new { cp.UserId, cp.User!.FullName, cp.Role })
                    .ToList(),
                LastMessage = _context.Messages
                    .Where(m => m.ConversationId == p.ConversationId)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new { m.Content, m.CreatedAt, m.SenderType })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(conversations);
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