using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using MedicalDiagnosis.Core.Entities;

namespace MedicalDiagnosis.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role> Roles { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<Doctor> Doctors { get; set; }
    public DbSet<UserSession> UserSessions { get; set; }
    public DbSet<MedicalImage> MedicalImages { get; set; }
    public DbSet<AiModel> AiModels { get; set; }
    public DbSet<AiInference> AiInferences { get; set; }
    public DbSet<AiResult> AiResults { get; set; }
    public DbSet<AiBoundingBox> AiBoundingBoxes { get; set; }
    public DbSet<ImageAssignment> ImageAssignments { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Diagnosis> Diagnoses { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationParticipant> ConversationParticipants { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<AiChatResponse> AiChatResponses { get; set; }
    public DbSet<AiSuggestion> AiSuggestions { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<AiInference> AIInferences { get; set; }
    public DbSet<AiResult> AIResults { get; set; }
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.ConfigureWarnings(w =>
            w.Ignore(RelationalEventId.PendingModelChangesWarning));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Patient>().HasKey(p => p.UserId);
        modelBuilder.Entity<Doctor>().HasKey(d => d.UserId);

        modelBuilder.Entity<Patient>()
            .HasOne(p => p.User).WithOne()
            .HasForeignKey<Patient>(p => p.UserId);

        modelBuilder.Entity<Doctor>()
            .HasOne(d => d.User).WithOne()
            .HasForeignKey<Doctor>(d => d.UserId);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Doctor>()
            .HasIndex(d => d.LicenseNumber).IsUnique();

        modelBuilder.Entity<MedicalImage>()
            .HasOne(m => m.Patient).WithMany()
            .HasForeignKey(m => m.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MedicalImage>()
            .HasOne(m => m.Uploader).WithMany()
            .HasForeignKey(m => m.UploadedBy)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ImageAssignment>()
            .HasOne(a => a.Doctor).WithMany()
            .HasForeignKey(a => a.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ImageAssignment>()
            .HasOne(a => a.Admin).WithMany()
            .HasForeignKey(a => a.AssignedBy)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Diagnosis>()
            .HasOne(d => d.Image).WithMany()
            .HasForeignKey(d => d.ImageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Diagnosis>()
            .HasOne(d => d.Doctor).WithMany()
            .HasForeignKey(d => d.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Sender).WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Image).WithMany()
            .HasForeignKey(m => m.ImageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Patient).WithMany()
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Doctor).WithMany()
            .HasForeignKey(a => a.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed data
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, RoleName = "admin" },
            new Role { Id = 2, RoleName = "doctor" },
            new Role { Id = 3, RoleName = "patient" }
        );

        const string adminHash   = "$2a$11$yA.GlwW2tXY3gsvDy8E5B.JlztRnF8KayaMxEww0Z3Mbg.g0CNGPq";
        const string doctorHash  = "$2a$11$qhfVvllmtzWQWRnZzhw6RurDquvovom2YA0cMMBWvOyVS/5jBVoZi";
        const string patientHash = "$2a$11$tCRI6nAjIt/lNYHE9zX0YuGJFTEzSw1qxK5KYF8RMw7cyPrQMGBkm";

        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Username = "admin01",   PasswordHash = adminHash,   Email = "admin@meddiag.vn",     FullName = "Quản Trị Viên",    RoleId = 1, IsActive = true, IsDeleted = false, CreatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc) },
            new User { Id = 2, Username = "bs_nguyen", PasswordHash = doctorHash,  Email = "nguyen.bs@meddiag.vn", FullName = "BS. Nguyễn Văn An", RoleId = 2, IsActive = true, IsDeleted = false, CreatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc) },
            new User { Id = 3, Username = "bs_tran",   PasswordHash = doctorHash,  Email = "tran.bs@meddiag.vn",   FullName = "BS. Trần Thị Bình", RoleId = 2, IsActive = true, IsDeleted = false, CreatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc) },
            new User { Id = 4, Username = "bn_hoang",  PasswordHash = patientHash, Email = "hoang.bn@gmail.com",   FullName = "Hoàng Minh Tuấn",   RoleId = 3, IsActive = true, IsDeleted = false, CreatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc) },
            new User { Id = 5, Username = "bn_le",     PasswordHash = patientHash, Email = "le.bn@gmail.com",      FullName = "Lê Thị Thu",        RoleId = 3, IsActive = true, IsDeleted = false, CreatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2025,1,1,0,0,0,DateTimeKind.Utc) }
        );

        modelBuilder.Entity<Doctor>().HasData(
            new Doctor { UserId = 2, Specialization = "Chẩn đoán hình ảnh", LicenseNumber = "BS-HN-001",  YearsOfExperience = 10 },
            new Doctor { UserId = 3, Specialization = "X-quang phổi",       LicenseNumber = "BS-HCM-002", YearsOfExperience = 7  }
        );

        modelBuilder.Entity<Patient>().HasData(
            new Patient { UserId = 4, Gender = "Male",   Phone = "0901234567", Address = "123 Nguyễn Trãi, Q.1, TP.HCM" },
            new Patient { UserId = 5, Gender = "Female", Phone = "0912345678", Address = "456 Lê Lợi, Q.3, TP.HCM"      }
        );
    }
}