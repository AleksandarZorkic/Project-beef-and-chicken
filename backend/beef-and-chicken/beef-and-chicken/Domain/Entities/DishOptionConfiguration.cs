using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class DishOptionConfiguration : IEntityTypeConfiguration<DishOption>
    {
        public void Configure(EntityTypeBuilder<DishOption> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.Type)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.Price)
                .IsRequired()
                .HasPrecision(12, 2);

            builder.Property(x => x.IsAlwaysPaid)
                .IsRequired();

            builder.Property(x => x.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(x => x.SortOrder)
                .IsRequired()
                .HasDefaultValue(0);

            builder.HasIndex(x => new { x.Type, x.Name })
                .IsUnique();

            builder.HasIndex(x => x.IsActive);
            builder.HasIndex(x => x.Type);
            builder.HasIndex(x => x.SortOrder);

            builder.ToTable("DishOptions", t =>
            {
                t.HasCheckConstraint(
                    "CK_DishOption_Price_NonNegative",
                    "\"Price\" >= 0"
                );

                t.HasCheckConstraint(
                    "CK_DishOption_SortOrder_NonNegative",
                    "\"SortOrder\" >= 0"
                );
            });
        }
    }
}