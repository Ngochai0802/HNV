using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedicalDiagnosis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixUserSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserSessions_Users_UserId",
                table: "UserSessions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserSessions",
                table: "UserSessions");

            migrationBuilder.RenameTable(
                name: "UserSessions",
                newName: "User_Sessions");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "User_Sessions",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "User_Sessions",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "RefreshToken",
                table: "User_Sessions",
                newName: "refresh_token");

            migrationBuilder.RenameColumn(
                name: "IpAddress",
                table: "User_Sessions",
                newName: "ip_address");

            migrationBuilder.RenameColumn(
                name: "ExpiresAt",
                table: "User_Sessions",
                newName: "expires_at");

            migrationBuilder.RenameColumn(
                name: "DeviceInfo",
                table: "User_Sessions",
                newName: "device_info");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "User_Sessions",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_UserSessions_UserId",
                table: "User_Sessions",
                newName: "IX_User_Sessions_user_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_User_Sessions",
                table: "User_Sessions",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_User_Sessions_Users_user_id",
                table: "User_Sessions",
                column: "user_id",
                principalTable: "Users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_User_Sessions_Users_user_id",
                table: "User_Sessions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_User_Sessions",
                table: "User_Sessions");

            migrationBuilder.RenameTable(
                name: "User_Sessions",
                newName: "UserSessions");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "UserSessions",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "UserSessions",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "refresh_token",
                table: "UserSessions",
                newName: "RefreshToken");

            migrationBuilder.RenameColumn(
                name: "ip_address",
                table: "UserSessions",
                newName: "IpAddress");

            migrationBuilder.RenameColumn(
                name: "expires_at",
                table: "UserSessions",
                newName: "ExpiresAt");

            migrationBuilder.RenameColumn(
                name: "device_info",
                table: "UserSessions",
                newName: "DeviceInfo");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "UserSessions",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_User_Sessions_user_id",
                table: "UserSessions",
                newName: "IX_UserSessions_UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserSessions",
                table: "UserSessions",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserSessions_Users_UserId",
                table: "UserSessions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
