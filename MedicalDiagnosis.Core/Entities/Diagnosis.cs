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

    [Column("final_result")]
    public string? FinalResult { get; set; }

    [Column("severity_level")]
    public string? SeverityLevel { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }

    [ForeignKey("DoctorId")]
    public virtual Doctor? Doctor { get; set; }
}