using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class RestaurantSettingsConfiguration
        : IEntityTypeConfiguration<RestaurantSettings>
    {
        public void Configure(EntityTypeBuilder<RestaurantSettings> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .ValueGeneratedNever();

            builder.Property(x => x.MinimumOrderAmount)
                .IsRequired()
                .HasPrecision(12, 2)
                .HasDefaultValue(800m);

            builder.Property(x => x.DeliveryFee)
                .IsRequired()
                .HasPrecision(12, 2)
                .HasDefaultValue(200m);

            builder.Property(x => x.FreeDeliveryThreshold)
                .HasPrecision(12, 2);

            builder.Property(x => x.IsDeliveryEnabled)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(x => x.UpdatedAt)
                .IsRequired();

            builder.ToTable("RestaurantSettings", t =>
            {
                t.HasCheckConstraint(
                    "CK_RestaurantSettings_MinimumOrderAmount_NonNegative",
                    "\"MinimumOrderAmount\" >= 0"
                );

                t.HasCheckConstraint(
                    "CK_RestaurantSettings_DeliveryFee_NonNegative",
                    "\"DeliveryFee\" >= 0"
                );

                t.HasCheckConstraint(
                    "CK_RestaurantSettings_FreeDeliveryThreshold_Positive",
                    "\"FreeDeliveryThreshold\" IS NULL OR \"FreeDeliveryThreshold\" > 0"
                );
            });
        }
    }
}