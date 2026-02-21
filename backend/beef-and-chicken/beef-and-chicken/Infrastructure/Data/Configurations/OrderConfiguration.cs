
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class OrderConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            // 1) Ograničenje dužine stringova
            builder.Property(o => o.Notes)
                .HasMaxLength(500);

            // 2) Precision za decimal (novac)
            builder.Property(o => o.Subtotal).HasPrecision(12, 2);
            builder.Property(o => o.DeliveryFee).HasPrecision(12, 2);
            builder.Property(o => o.TotalAmount).HasPrecision(12, 2);

            // 3) Snapshot adrese = Owned Entity
            builder.OwnsOne(o => o.DeliveryAddress, a =>
            {
                a.Property(p => p.Street)
                    .HasColumnName("DeliveryStreet")
                    .HasMaxLength(200)
                    .IsRequired();

                a.Property(p => p.HouseNumber)
                    .HasColumnName("DeliveryHouseNumber")
                    .HasMaxLength(100)
                    .IsRequired();

                a.Property(p => p.PostalCode)
                    .HasColumnName("DeliveryPostalCode")
                    .HasMaxLength(20);

                a.Property(p => p.City)
                    .HasColumnName("DeliveryCity")
                    .HasMaxLength(50)
                    .IsRequired();
            });

            builder.Navigation(o => o.DeliveryAddress).IsRequired();
        }
    }
}
