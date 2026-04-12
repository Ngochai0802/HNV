using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Suggestions")]
public class AiSuggestion
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("image_id")]
    public int ImageId { get; set; }

    [Column("suggested_text")]
    public string SuggestedText { get; set; } = null!;

    [Column("is_used_by_doctor")]
    public bool IsUsedByDoctor { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey("ImageId")]
    public virtual MedicalImage? Image { get; set; }
}