using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedicalDiagnosis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$AAAAAAAAAAAAAAAAAAAAAAO8GmFD3MfLkBMW6E.8eRNPFSFl6YFHS", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 2,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$BBBBBBBBBBBBBBBBBBBBBBO3HnGE4NmGlCNb7F9fSGTGHl7ZFHS", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 3,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$BBBBBBBBBBBBBBBBBBBBBBO3HnGE4NmGlCNb7F9fSGTGHl7ZFHS", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 4,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$CCCCCCCCCCCCCCCCCCCCCCo3HnGE4NmGlCNb7F9fSGTGHl7ZFHS", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 5,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$CCCCCCCCCCCCCCCCCCCCCCo3HnGE4NmGlCNb7F9fSGTGHl7ZFHS", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$Tq4yJrIZBXlJI7koe2ffF.I/H8Zj8hGn1r52uVQQhOZ732pqyTtlO", new DateTime(2026, 4, 3, 9, 38, 57, 782, DateTimeKind.Local).AddTicks(1600) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 2,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$ILE/Qnh1LzFcn7eJ20VCeOfrqYtPcONAJbpiIE/Z4MCnlltRNjsTm", new DateTime(2026, 4, 3, 9, 38, 58, 66, DateTimeKind.Local).AddTicks(8315) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 3,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$mKbCecEciFUfAaEWedoiKO57YAdfsQ4bEOoVnRn6/E0tXlRZBZDPW", new DateTime(2026, 4, 3, 9, 38, 58, 206, DateTimeKind.Local).AddTicks(4262) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 4,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$Qn9MAPv7AOfuQrVpovHBwO1fPaFZldb6TyqgmRyd8JSmlCOi7wpxq", new DateTime(2026, 4, 3, 9, 38, 58, 337, DateTimeKind.Local).AddTicks(6152) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 5,
                columns: new[] { "password_hash", "updated_at" },
                values: new object[] { "$2a$11$PQTtvJFEswI.W67OPepxdut.C26n8dufrmW3xj2UQShKQXNBqf9A6", new DateTime(2026, 4, 3, 9, 38, 58, 459, DateTimeKind.Local).AddTicks(860) });
        }
    }
}
