using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace beef_and_chicken.Infrastructure.Seed
{
    public class RoleSeeder
    {
        public static async Task SeedRolesAsync(IServiceProvider services)
        {
            using var score = services.CreateScope();

            var roleManager = score.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();

            var roles = new[]
            {
                AppRoles.Admin,
                AppRoles.Customer,
                AppRoles.Employee,
                AppRoles.Courier,
            };

            foreach (var role in roles)
            {
                var exists = await roleManager.RoleExistsAsync(role);

                if (!exists)
                {
                    await roleManager.CreateAsync(new IdentityRole<int>
                    {
                        Name = role,
                    });
                }
            }
        }
    }
}
