using beef_and_chicken.Application.Mapping;
using beef_and_chicken.Infrastructure.Data;
using beef_and_chicken.Presentation.Middlewear;
using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Services;
using beef_and_chicken.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAutoMapper(cfg => { 
    cfg.AddProfile<MappingProfile>(); 
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IMenuRepository, MenuRepository>();

builder.Services.AddTransient<ExceptionHandlingMiddleware>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Front", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseCors("Front");

    app.UseAuthorization();
    app.MapControllers();

    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.Run();
