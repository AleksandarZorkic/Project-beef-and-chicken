using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class UserAllergenConfiguration : IEntityTypeConfiguration<UserAllergen>
    {
        public void Configure(EntityTypeBuilder<UserAllergen> builder)
        {
            // Kompozitni kljuc koji sprecava duplikate
            builder.HasKey(x => new { x.UserId, x.AllergenId });

            // Relacija ka User entitetu
            builder.HasOne(x => x.User)
                .WithMany(x => x.UserAllergens)
                .HasForeignKey(x => x.UserId);

            // Relacija ka Allergen entitetu
            builder.HasOne(x => x.Allergen)
                .WithMany(x => x.UserAllergens)
                .HasForeignKey(x => x.AllergenId);
        }
    }
}
