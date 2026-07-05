using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedicalDiagnosis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationRelatedUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "username",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "Users",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "full_name",
                table: "Users",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "email",
                table: "Users",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "dob",
                table: "Patients",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "years_of_experience",
                table: "Doctors",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateTable(
                name: "AI_Models",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    model_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    version = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accuracy = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Models", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    patient_id = table.Column<int>(type: "int", nullable: false),
                    doctor_id = table.Column<int>(type: "int", nullable: false),
                    appointment_time = table.Column<DateTime>(type: "datetime2", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.id);
                    table.ForeignKey(
                        name: "FK_Appointments_Doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "Doctors",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_Patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "Patients",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Medical_Images",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    patient_id = table.Column<int>(type: "int", nullable: false),
                    uploaded_by = table.Column<int>(type: "int", nullable: false),
                    image_url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    file_name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    file_size = table.Column<long>(type: "bigint", nullable: true),
                    upload_date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Medical_Images", x => x.id);
                    table.ForeignKey(
                        name: "FK_Medical_Images_Patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "Patients",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Medical_Images_Users_uploaded_by",
                        column: x => x.uploaded_by,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_read = table.Column<bool>(type: "bit", nullable: false),
                    related_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Conversation_Participants",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    conversation_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    role = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversation_Participants", x => x.id);
                    table.ForeignKey(
                        name: "FK_Conversation_Participants_Conversations_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "Conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Conversation_Participants_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AI_Chat_Responses",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    image_id = table.Column<int>(type: "int", nullable: false),
                    inference_id = table.Column<int>(type: "int", nullable: true),
                    message_content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    confidence_score = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Chat_Responses", x => x.id);
                    table.ForeignKey(
                        name: "FK_AI_Chat_Responses_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AI_Inferences",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    image_id = table.Column<int>(type: "int", nullable: false),
                    model_id = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    inference_time = table.Column<double>(type: "float", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Inferences", x => x.id);
                    table.ForeignKey(
                        name: "FK_AI_Inferences_AI_Models_model_id",
                        column: x => x.model_id,
                        principalTable: "AI_Models",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AI_Inferences_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AI_Suggestions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    image_id = table.Column<int>(type: "int", nullable: false),
                    suggested_text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    is_used_by_doctor = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Suggestions", x => x.id);
                    table.ForeignKey(
                        name: "FK_AI_Suggestions_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Diagnoses",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    image_id = table.Column<int>(type: "int", nullable: false),
                    doctor_id = table.Column<int>(type: "int", nullable: false),
                    diagnosis_text = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    final_result = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    severity_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AIFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    heatmap_path = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    confidence_score = table.Column<double>(type: "float", nullable: true),
                    HasAbnormality = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Diagnoses", x => x.id);
                    table.ForeignKey(
                        name: "FK_Diagnoses_Doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "Doctors",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Diagnoses_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Image_Assignments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    image_id = table.Column<int>(type: "int", nullable: false),
                    doctor_id = table.Column<int>(type: "int", nullable: false),
                    assigned_by = table.Column<int>(type: "int", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Image_Assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_Image_Assignments_Doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "Doctors",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Image_Assignments_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Image_Assignments_Users_assigned_by",
                        column: x => x.assigned_by,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    conversation_id = table.Column<int>(type: "int", nullable: false),
                    sender_id = table.Column<int>(type: "int", nullable: true),
                    sender_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    image_id = table.Column<int>(type: "int", nullable: true),
                    is_read = table.Column<bool>(type: "bit", nullable: false),
                    is_ai_generated = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_Messages_Conversations_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "Conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Messages_Medical_Images_image_id",
                        column: x => x.image_id,
                        principalTable: "Medical_Images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Messages_Users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "Users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AI_Results",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    inference_id = table.Column<int>(type: "int", nullable: false),
                    prediction_label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    confidence_score = table.Column<double>(type: "float", nullable: true),
                    processed_image_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    severity_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    heatmap_base64 = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Results", x => x.id);
                    table.ForeignKey(
                        name: "FK_AI_Results_AI_Inferences_inference_id",
                        column: x => x.inference_id,
                        principalTable: "AI_Inferences",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AI_Bounding_Boxes",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    result_id = table.Column<int>(type: "int", nullable: false),
                    x = table.Column<double>(type: "float", nullable: false),
                    y = table.Column<double>(type: "float", nullable: false),
                    width = table.Column<double>(type: "float", nullable: false),
                    height = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AI_Bounding_Boxes", x => x.id);
                    table.ForeignKey(
                        name: "FK_AI_Bounding_Boxes_AI_Results_result_id",
                        column: x => x.result_id,
                        principalTable: "AI_Results",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Patients",
                keyColumn: "user_id",
                keyValue: 4,
                column: "dob",
                value: null);

            migrationBuilder.UpdateData(
                table: "Patients",
                keyColumn: "user_id",
                keyValue: 5,
                column: "dob",
                value: null);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 1,
                column: "password_hash",
                value: "$2a$11$yA.GlwW2tXY3gsvDy8E5B.JlztRnF8KayaMxEww0Z3Mbg.g0CNGPq");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 2,
                column: "password_hash",
                value: "$2a$11$qhfVvllmtzWQWRnZzhw6RurDquvovom2YA0cMMBWvOyVS/5jBVoZi");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 3,
                column: "password_hash",
                value: "$2a$11$qhfVvllmtzWQWRnZzhw6RurDquvovom2YA0cMMBWvOyVS/5jBVoZi");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 4,
                column: "password_hash",
                value: "$2a$11$tCRI6nAjIt/lNYHE9zX0YuGJFTEzSw1qxK5KYF8RMw7cyPrQMGBkm");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 5,
                column: "password_hash",
                value: "$2a$11$tCRI6nAjIt/lNYHE9zX0YuGJFTEzSw1qxK5KYF8RMw7cyPrQMGBkm");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Bounding_Boxes_result_id",
                table: "AI_Bounding_Boxes",
                column: "result_id");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Chat_Responses_image_id",
                table: "AI_Chat_Responses",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Inferences_image_id",
                table: "AI_Inferences",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Inferences_model_id",
                table: "AI_Inferences",
                column: "model_id");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Results_inference_id",
                table: "AI_Results",
                column: "inference_id");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Suggestions_image_id",
                table: "AI_Suggestions",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_doctor_id",
                table: "Appointments",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_patient_id",
                table: "Appointments",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_Conversation_Participants_conversation_id",
                table: "Conversation_Participants",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_Conversation_Participants_user_id",
                table: "Conversation_Participants",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Diagnoses_doctor_id",
                table: "Diagnoses",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_Diagnoses_image_id",
                table: "Diagnoses",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_Image_Assignments_assigned_by",
                table: "Image_Assignments",
                column: "assigned_by");

            migrationBuilder.CreateIndex(
                name: "IX_Image_Assignments_doctor_id",
                table: "Image_Assignments",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_Image_Assignments_image_id",
                table: "Image_Assignments",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_Medical_Images_patient_id",
                table: "Medical_Images",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_Medical_Images_uploaded_by",
                table: "Medical_Images",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_conversation_id",
                table: "Messages",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_image_id",
                table: "Messages",
                column: "image_id");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_sender_id",
                table: "Messages",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_user_id",
                table: "Notifications",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AI_Bounding_Boxes");

            migrationBuilder.DropTable(
                name: "AI_Chat_Responses");

            migrationBuilder.DropTable(
                name: "AI_Suggestions");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "Conversation_Participants");

            migrationBuilder.DropTable(
                name: "Diagnoses");

            migrationBuilder.DropTable(
                name: "Image_Assignments");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "AI_Results");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DropTable(
                name: "AI_Inferences");

            migrationBuilder.DropTable(
                name: "AI_Models");

            migrationBuilder.DropTable(
                name: "Medical_Images");

            migrationBuilder.AlterColumn<string>(
                name: "username",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "full_name",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "email",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "dob",
                table: "Patients",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "years_of_experience",
                table: "Doctors",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "Patients",
                keyColumn: "user_id",
                keyValue: 4,
                column: "dob",
                value: null);

            migrationBuilder.UpdateData(
                table: "Patients",
                keyColumn: "user_id",
                keyValue: 5,
                column: "dob",
                value: null);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 1,
                column: "password_hash",
                value: "$2a$11$AAAAAAAAAAAAAAAAAAAAAAO8GmFD3MfLkBMW6E.8eRNPFSFl6YFHS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 2,
                column: "password_hash",
                value: "$2a$11$BBBBBBBBBBBBBBBBBBBBBBO3HnGE4NmGlCNb7F9fSGTGHl7ZFHS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 3,
                column: "password_hash",
                value: "$2a$11$BBBBBBBBBBBBBBBBBBBBBBO3HnGE4NmGlCNb7F9fSGTGHl7ZFHS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 4,
                column: "password_hash",
                value: "$2a$11$CCCCCCCCCCCCCCCCCCCCCCo3HnGE4NmGlCNb7F9fSGTGHl7ZFHS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "id",
                keyValue: 5,
                column: "password_hash",
                value: "$2a$11$CCCCCCCCCCCCCCCCCCCCCCo3HnGE4NmGlCNb7F9fSGTGHl7ZFHS");
        }
    }
}
