using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Results")]
public class AiResult
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("inference_id")]
    public int InferenceId { get; set; }

    [Column("prediction_label")]
    public string PredictionLabel { get; set; } = null!;

    [Column("confidence_score")]
    public decimal ConfidenceScore { get; set; }

    [Column("processed_image_url")]
    public string? ProcessedImageUrl { get; set; }

    [ForeignKey("InferenceId")]
    public virtual AiInference? Inference { get; set; }
}