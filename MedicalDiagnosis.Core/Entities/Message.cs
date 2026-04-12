using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Messages")]
public class Message
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("conversation_id")]
    public int ConversationId { get; set; }

    [Column("sender_id")]
    public int? SenderId { get; set; }

    [Column("sender_type")]
    public string SenderType { get; set; } = "user";

    [Column("content")]
    public string Content { get; set; } = null!;

    [Column("image_id")]
    public int? ImageId { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; } = false;

    [Column("is_ai_generated")]
    public bool IsAiGenerated { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey("ConversationId")]
    public virtual Conversation? Conversation { get; set; }

    [ForeignKey("SenderId")]
    public virtual User? Sender { get; set; }

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }
}