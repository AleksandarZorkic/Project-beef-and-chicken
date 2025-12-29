using beef_and_chicken.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class DishAllergenConfiguration : IEntityTypeConfiguration<DishAllergen>
    {
        public void Configure(EntityTypeBuilder<DishAllergen> builder)
        {
            // Kompozitni kljuc koji sprecava duplikate
            builder.HasKey(x => new { x.DishId, x.AllergenId });

            builder.Property(x => x.IsTrace)
                .HasDefaultValue(false);
            
            builder.HasOne(x => x.Dish)
                .WithMany(x => x.DishAllergens)
                .HasForeignKey(x => x.DishId);

            builder.HasOne(x => x.Allergen)
                .WithMany(x => x.DishAllergens)
                .HasForeignKey(x => x.AllergenId);
        }
    }
}
