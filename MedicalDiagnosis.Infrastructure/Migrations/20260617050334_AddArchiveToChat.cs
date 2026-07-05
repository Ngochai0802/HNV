using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedicalDiagnosis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddArchiveToChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_archived",
                table: "Conversation_Participants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "cancel_reason",
                table: "Appointments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_archived",
                table: "Conversation_Participants");

            migrationBuilder.DropColumn(
                name: "cancel_reason",
                table: "Appointments");
        }
    }
}
