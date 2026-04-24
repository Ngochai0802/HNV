using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Diagnoses")]
public class Diagnosis
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("image_id")]
    public int ImageId { get; set; }

    [Column("doctor_id")]
    public int DoctorId { get; set; }

    [Column("diagnosis_text")]
    public string? DiagnosisText { get; set; }

    // Ánh xạ 'FinalResult' trong code vào cột 'result' trong DB
    [Column("result")]
    public string? FinalResult { get; set; }

    [Column("severity_level")]
    public string? SeverityLevel { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [Column("AIFindings")]
    public string? AIFindings { get; set; }    // JSON string

    // Ánh xạ 'HeatmapPath' vào cột 'heatmap_path'
    [Column("heatmap_path")]
    public string? HeatmapPath { get; set; }   // Path lưu trong wwwroot

    // Ánh xạ 'Confidence' vào cột 'confidence_score'
    [Column("confidence_score")]
    public float Confidence { get; set; }

    [Column("HasAbnormality")]
    public bool HasAbnormality { get; set; }

    // --- Navigation Properties ---
    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }

    [ForeignKey("DoctorId")]
    public virtual Doctor? Doctor { get; set; }
}