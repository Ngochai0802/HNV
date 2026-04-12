using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("Medical_Images")]
public class MedicalImage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("patient_id")]
    public int PatientId { get; set; }

    [Column("uploaded_by")]
    public int UploadedBy { get; set; }

    [Column("image_url")]
    public string ImageUrl { get; set; } = null!;

    [Column("file_name")]
    public string FileName { get; set; } = null!;

    [Column("file_size")]
    public long? FileSize { get; set; }

    [Column("upload_date")]
    public DateTime UploadDate { get; set; } = DateTime.Now;

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("is_deleted")]
    public bool IsDeleted { get; set; } = false;

    [ForeignKey("PatientId")]
    public virtual Patient? Patient { get; set; }

    [ForeignKey("UploadedBy")]
    public virtual User? Uploader { get; set; }
}