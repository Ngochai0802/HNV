using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Image_Assignments")]
public class ImageAssignment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("image_id")]
    public int ImageId { get; set; }

    [Column("doctor_id")]
    public int DoctorId { get; set; }

    [Column("assigned_by")]
    public int AssignedBy { get; set; }

    [Column("assigned_at")]
    public DateTime AssignedAt { get; set; } = DateTime.Now;

    [Column("status")]
    public string Status { get; set; } = "pending";

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }

    [ForeignKey("DoctorId")]
    public virtual Doctor? Doctor { get; set; }

    [ForeignKey("AssignedBy")]
    public virtual User? Admin { get; set; }
}