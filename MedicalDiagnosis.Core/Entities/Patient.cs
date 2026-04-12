using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Patients")]
public class Patient
{
    [Key]
    [Column("user_id")]        // <-- đây là chỗ bị lỗi, thiếu dòng này
    public int UserId { get; set; }

    [Column("dob")]
    public DateOnly? Dob { get; set; }

    [Column("gender")]
    public string? Gender { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}