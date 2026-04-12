using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDiagnosis.Core.Entities;

[Table("AI_Bounding_Boxes")]
public class AiBoundingBox
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("result_id")]
    public int ResultId { get; set; }

    [Column("x")]
    public double X { get; set; }

    [Column("y")]
    public double Y { get; set; }

    [Column("width")]
    public double Width { get; set; }

    [Column("height")]
    public double Height { get; set; }

    [ForeignKey("ResultId")]
    public virtual AiResult? Result { get; set; }
}