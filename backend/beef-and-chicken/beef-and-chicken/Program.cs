using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.Mapping;
using beef_and_chicken.Application.Options;
using beef_and_chicken.Application.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.BackgroundServices;
using beef_and_chicken.Infrastructure.Data;
using beef_and_chicken.Infrastructure.Repositories;
using beef_and_chicken.Infrastructure.Seed;
using beef_and_chicken.Infrastructure.Services;
using beef_and_chicken.Presentation.Middlewear;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using beef_and_chicken.Presentation.Hubs;
using beef_and_chicken.Presentation.Realtime;
using beef_and_chicken.Domain.Games.DeliveryRush;
using beef_and_chicken.Presentation.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using beef_and_chicken.Application.DTOs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    const string schemeId = "Bearer";

    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Beef and Chicken API",
        Version = "v1"
    });

    c.AddSecurityDefinition(schemeId, new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Unesi JWT token"
    });

    c.AddSecurityRequirement(document => new()
    {
        [new OpenApiSecuritySchemeReference(schemeId, document)] = []
    });
});

builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<MappingProfile>();
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection nije podešen.")
    ));

builder.Services.AddIdentity<User, IdentityRole<int>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 8;
    options.User.RequireUniqueEmail = true;
});

builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(1);
});

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer nije podešen.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience nije podešen.");
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key nije podešen.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})

.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateLifetime = true,
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        RoleClaimType = ClaimTypes.Role
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrWhiteSpace(accessToken) &&
                path.StartsWithSegments("/hubs/orders"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IMenuRepository, MenuRepository>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<IAddressRepository, AddressRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAllergenRepository, AllergenRepository>();
builder.Services.AddScoped<IAllergenService, AllergenService>();
builder.Services.AddScoped<IUserAllergenRepository, UserAllergenRepository>();
builder.Services.AddScoped<IUserAllergenService, UserAllergenService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IAdminUserQueryRepository, AdminUserQueryRepository>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.Configure<UserAnonymizationOptions>(
    builder.Configuration.GetSection("UserAnonymization")
);

builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection("Email")
);

builder.Services.AddScoped<IEmailService, SmtpEmailService>();

builder.Services.AddScoped<IUserAnonymizationService, UserAnonymizationService>();
builder.Services.AddScoped<IUserPersonalDataCleanupService, UserPersonalDataCleanupService>();
builder.Services.AddScoped<IDishOptionRepository, DishOptionRepository>();
builder.Services.AddScoped<IDishOptionService, DishOptionService>();

builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICategoryService, CategoryService>();

builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();

builder.Services.AddScoped<IRestaurantSettingsRepository, RestaurantSettingsRepository>();
builder.Services.AddScoped<IRestaurantSettingsService, RestaurantSettingsService>();
builder.Services.AddScoped<IFastFoodWorkTimeRepository, FastFoodWorkTimeRepository>();

builder.Services.AddScoped<IVisitLogRepository, VisitLogRepository>();
builder.Services.AddScoped<IVisitTrackingService, VisitTrackingService>();

builder.Services.AddScoped<IFeedbackMessageRepository, FeedbackMessageRepository>();
builder.Services.AddScoped<IFeedbackMessageService, FeedbackMessageService>();

builder.Services.AddScoped<IDeliveryRushRunRepository, DeliveryRushRunRepository>();
builder.Services.AddScoped<IDeliveryRushService, DeliveryRushService>();

builder.Services.AddSingleton<DeliveryRushSimulator>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

builder.Services.AddSingleton<IDeliveryRushSeedGenerator, DeliveryRushSeedGenerator>();

builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });

builder.Services.AddScoped<IOrderNotificationService, OrderNotificationService>();

builder.Services.AddHostedService<BlockedUsersAnonymizationBackgroundService>();

builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();

builder.Services.AddHttpContextAccessor();

builder.Services.AddTransient<ExceptionHandlingMiddleware>();
builder.Services.AddAuthorization();


builder.Services.AddCors(options =>
{
    options.AddPolicy("Front", p =>
        p.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:5174",
                "https://localhost:5174")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.AddPolicy(
        RateLimitPolicies.DeliveryRushStart,
        httpContext =>
        {
            var partitionKey =
                GetRateLimitPartitionKey(httpContext);

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    QueueProcessingOrder =
                        QueueProcessingOrder.OldestFirst,
                    AutoReplenishment = true
                });
        });

    options.AddPolicy(
        RateLimitPolicies.DeliveryRushFinish,
        httpContext =>
        {
            var partitionKey =
                GetRateLimitPartitionKey(httpContext);

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    QueueProcessingOrder =
                        QueueProcessingOrder.OldestFirst,
                    AutoReplenishment = true
                });
        });

    options.OnRejected = async (rejectedContext, ct) =>
    {
        var httpContext =
            rejectedContext.HttpContext;

        var traceId =
            httpContext.TraceIdentifier;

        httpContext.Response.Headers["X-Trace-Id"] =
            traceId;

        if (rejectedContext.Lease.TryGetMetadata(
                MetadataName.RetryAfter,
                out var retryAfter))
        {
            httpContext.Response.Headers["Retry-After"] =
                Math.Ceiling(
                    retryAfter.TotalSeconds)
                .ToString();
        }

        var response = new ApiErrorResponseDto
        {
            Error =
                "Previše zahteva. Pokušajte ponovo za nekoliko trenutaka.",

            TraceId = traceId
        };

        await httpContext.Response.WriteAsJsonAsync(
            response,
            cancellationToken: ct);
    };

    options.AddPolicy(
    RateLimitPolicies.FeedbackCreate,
    httpContext =>
    {
        var partitionKey =
            GetRateLimitPartitionKey(httpContext);

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });
});


var app = builder.Build();

await RoleSeeder.SeedRolesAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Front");
app.UseStaticFiles();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OrderHub>("/hubs/orders");

app.Run();

static string GetRateLimitPartitionKey(
    HttpContext httpContext)
{
    var userId = httpContext.User.FindFirstValue(
        ClaimTypes.NameIdentifier);

    if (!string.IsNullOrWhiteSpace(userId))
    {
        return $"user:{userId}";
    }

    var ipAddress = httpContext.Connection
        .RemoteIpAddress?
        .ToString();

    return $"ip:{ipAddress ?? "unknown"}";
}

public partial class Program
{
}