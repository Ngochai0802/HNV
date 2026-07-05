using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Collections.Concurrent;

namespace MedicalDiagnosis.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    // Dictionary lưu trữ trạng thái online: UserId -> Số lượng connection
    public static readonly ConcurrentDictionary<int, int> OnlineUsers = new();

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
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out int userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            OnlineUsers.AddOrUpdate(userId, 1, (key, count) => count + 1);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdStr, out int userId))
        {
            OnlineUsers.AddOrUpdate(userId, 0, (key, count) => Math.Max(0, count - 1));
        }
        await base.OnDisconnectedAsync(exception);
    }
}