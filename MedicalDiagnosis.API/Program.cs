using MedicalDiagnosis.API.Services;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MedicalDiagnosis.API.Hubs;
var builder = WebApplication.CreateBuilder(args);

// 1. Database
builder.Services.AddSingleton<SlowQueryInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.CommandTimeout(120))
    .AddInterceptors(sp.GetRequiredService<SlowQueryInterceptor>()));

// 2. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// 3. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());  // BẮT BUỘC cho SignalR
});

// 4. Services
builder.Services.AddScoped<JwtService>();
builder.Services.AddSingleton<AutoAssignService>();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHttpClient("AI", c =>
{
    c.BaseAddress = new Uri("http://localhost:8000");
    c.Timeout = TimeSpan.FromSeconds(90);
});

// 5. Swagger
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE Conversation_Participants ADD is_archived bit NOT NULL DEFAULT 0;");
    }
    catch { } // Bỏ qua nếu cột đã tồn tại
}

// 6. Middleware
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/openapi/v1.json", "Medical Diagnosis API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseStaticFiles(); // Serve ảnh từ wwwroot/uploads/
app.UseCors("AllowReact");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
