using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Inferences")]
public class AiInference
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("image_id")]
    public int ImageId { get; set; }

    [Column("model_id")]
    public int ModelId { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("inference_time")]
    public double? InferenceTime { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }

    [ForeignKey("ModelId")]
    public virtual AiModel? Model { get; set; }
}