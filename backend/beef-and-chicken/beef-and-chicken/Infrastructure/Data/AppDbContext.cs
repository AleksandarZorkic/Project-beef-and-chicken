using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Allergen> Allergens => Set<Allergen>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Dish> Dishes => Set<Dish>();
        public DbSet<DishAllergen> DishAllergens => Set<DishAllergen>();
        public DbSet<EmployeeWorkTime> EmployeeWorkTimes => Set<EmployeeWorkTime>();
        public DbSet<FastFoodWorkTime> FastFoodWorkTimes => Set<FastFoodWorkTime>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<User> Users => Set<User>();
        public DbSet<UserAllergen> UserAllergens => Set<UserAllergen>();
        


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
