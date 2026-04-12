using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Models")]
public class AiModel
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("model_name")]
    public string ModelName { get; set; } = null!;

    [Column("version")]
    public string Version { get; set; } = null!;

    [Column("accuracy")]
    public decimal? Accuracy { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}