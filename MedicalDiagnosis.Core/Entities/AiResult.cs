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
    public double ConfidenceScore { get; set; }

    // Cột này trong DB đang là NULL (màu vàng trong ảnh), nên để string?
    [Column("processed_image_url")]
    public string? ProcessedImageUrl { get; set; }

    // BỔ SUNG: Cột severity_level (Có trong ảnh DB của bạn)
    [Column("severity_level")]
    public string? SeverityLevel { get; set; }

    // BỔ SUNG: Cột heatmap_base64 (Có trong ảnh DB của bạn)
    [Column("heatmap_base64")]
    public string? HeatmapBase64 { get; set; }

    [ForeignKey("InferenceId")]
    public virtual AiInference? Inference { get; set; }
}