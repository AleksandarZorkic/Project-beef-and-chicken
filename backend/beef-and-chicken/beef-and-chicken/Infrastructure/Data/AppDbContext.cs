using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Domain.Entities.Constants;

namespace beef_and_chicken.Infrastructure.Data
{
    public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int >, IUnitOfWork
    {
        public AppDbContext(DbContextOptions<AppDbContext> options): base(options) { }

        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Allergen> Allergens => Set<Allergen>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Dish> Dishes => Set<Dish>();
        public DbSet<DishAllergen> DishAllergens => Set<DishAllergen>();
        public DbSet<EmployeeWorkTime> EmployeeWorkTimes => Set<EmployeeWorkTime>();
        public DbSet<FastFoodWorkTime> FastFoodWorkTimes => Set<FastFoodWorkTime>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<UserAllergen> UserAllergens => Set<UserAllergen>();
        public DbSet<AuditLog> AuditLogs {  get; set; }
        public DbSet<DishOption> DishOptions { get; set; }
        public DbSet<OrderItemOption> OrderItemOptions { get; set; }
        public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
        public DbSet<Announcement> Announcements => Set<Announcement>();
        public DbSet<RestaurantSettings> RestaurantSettings => Set<RestaurantSettings>();
        public DbSet<VisitLog> VisitLogs => Set<VisitLog>();
        public DbSet<DeliveryRushRun> DeliveryRushRuns => Set<DeliveryRushRun>();
        public DbSet<FeedbackMessage> FeedbackMessages => Set<FeedbackMessage>();
        public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
