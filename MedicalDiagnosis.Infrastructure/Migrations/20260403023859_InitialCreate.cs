using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MedicalDiagnosis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    username = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    full_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    role_id = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false),
                    last_login = table.Column<DateTime>(type: "datetime2", nullable: true),
                    failed_attempts = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.id);
                    table.ForeignKey(
                        name: "FK_Users_Roles_role_id",
                        column: x => x.role_id,
                        principalTable: "Roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Doctors",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false),
                    specialization = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    license_number = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    years_of_experience = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Doctors", x => x.user_id);
                    table.ForeignKey(
                        name: "FK_Doctors_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false),
                    dob = table.Column<DateOnly>(type: "date", nullable: true),
                    gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    address = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.user_id);
                    table.ForeignKey(
                        name: "FK_Patients_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RefreshToken = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceInfo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "id", "role_name" },
                values: new object[,]
                {
                    { 1, "admin" },
                    { 2, "doctor" },
                    { 3, "patient" }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "id", "created_at", "email", "failed_attempts", "full_name", "is_active", "is_deleted", "last_login", "password_hash", "role_id", "updated_at", "username" },
                values: new object[,]
                {
                    { 1, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "admin@meddiag.vn", 0, "Quản Trị Viên", true, false, null, "$2a$11$Tq4yJrIZBXlJI7koe2ffF.I/H8Zj8hGn1r52uVQQhOZ732pqyTtlO", 1, new DateTime(2026, 4, 3, 9, 38, 57, 782, DateTimeKind.Local).AddTicks(1600), "admin01" },
                    { 2, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "nguyen.bs@meddiag.vn", 0, "BS. Nguyễn Văn An", true, false, null, "$2a$11$ILE/Qnh1LzFcn7eJ20VCeOfrqYtPcONAJbpiIE/Z4MCnlltRNjsTm", 2, new DateTime(2026, 4, 3, 9, 38, 58, 66, DateTimeKind.Local).AddTicks(8315), "bs_nguyen" },
                    { 3, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "tran.bs@meddiag.vn", 0, "BS. Trần Thị Bình", true, false, null, "$2a$11$mKbCecEciFUfAaEWedoiKO57YAdfsQ4bEOoVnRn6/E0tXlRZBZDPW", 2, new DateTime(2026, 4, 3, 9, 38, 58, 206, DateTimeKind.Local).AddTicks(4262), "bs_tran" },
                    { 4, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "hoang.bn@gmail.com", 0, "Hoàng Minh Tuấn", true, false, null, "$2a$11$Qn9MAPv7AOfuQrVpovHBwO1fPaFZldb6TyqgmRyd8JSmlCOi7wpxq", 3, new DateTime(2026, 4, 3, 9, 38, 58, 337, DateTimeKind.Local).AddTicks(6152), "bn_hoang" },
                    { 5, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "le.bn@gmail.com", 0, "Lê Thị Thu", true, false, null, "$2a$11$PQTtvJFEswI.W67OPepxdut.C26n8dufrmW3xj2UQShKQXNBqf9A6", 3, new DateTime(2026, 4, 3, 9, 38, 58, 459, DateTimeKind.Local).AddTicks(860), "bn_le" }
                });

            migrationBuilder.InsertData(
                table: "Doctors",
                columns: new[] { "user_id", "license_number", "specialization", "years_of_experience" },
                values: new object[,]
                {
                    { 2, "BS-HN-001", "Chẩn đoán hình ảnh", 10 },
                    { 3, "BS-HCM-002", "X-quang phổi", 7 }
                });

            migrationBuilder.InsertData(
                table: "Patients",
                columns: new[] { "user_id", "address", "dob", "gender", "phone" },
                values: new object[,]
                {
                    { 4, "123 Nguyễn Trãi, Q.1, TP.HCM", null, "Male", "0901234567" },
                    { 5, "456 Lê Lợi, Q.3, TP.HCM", null, "Female", "0912345678" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_license_number",
                table: "Doctors",
                column: "license_number",
                unique: true,
                filter: "[license_number] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_email",
                table: "Users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_role_id",
                table: "Users",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_Users_username",
                table: "Users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId",
                table: "UserSessions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Doctors");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropTable(
                name: "UserSessions");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
