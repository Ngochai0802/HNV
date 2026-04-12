using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Chat_Responses")]
public class AiChatResponse
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("image_id")]
    public int ImageId { get; set; }

    [Column("inference_id")]
    public int? InferenceId { get; set; }

    [Column("message_content")]
    public string MessageContent { get; set; } = null!;

    [Column("confidence_score")]
    public decimal? ConfidenceScore { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }
}