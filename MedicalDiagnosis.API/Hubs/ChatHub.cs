using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    // Client gọi để vào phòng chat
    public async Task JoinConversation(string conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv_{conversationId}");
    }

    // Client gọi để rời phòng chat
    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv_{conversationId}");
    }

    // Client gọi để gửi tin nhắn real-time
    public async Task SendMessage(string conversationId, string content, string senderName, bool isAi)
    {
        await Clients.Group($"conv_{conversationId}").SendAsync("ReceiveMessage", new
        {
            content,
            senderName,
            isAi,
            createdAt = DateTime.Now
        });
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        await base.OnConnectedAsync();
    }
}