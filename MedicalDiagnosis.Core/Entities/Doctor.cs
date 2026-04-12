using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Doctors")]
public class Doctor
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("specialization")]
    public string? Specialization { get; set; }

    [Column("license_number")]
    public string? LicenseNumber { get; set; }

    [Column("years_of_experience")]
    public int YearsOfExperience { get; set; } = 0;

    // Navigation
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}