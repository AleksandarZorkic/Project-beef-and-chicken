using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class OrderConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            builder.HasKey(o => o.Id);

            builder.Property(o => o.CreatedAt)
                .IsRequired();

            builder.Property(o => o.Notes)
                .HasMaxLength(500);

            builder.Property(o => o.Subtotal)
                .IsRequired()
                .HasPrecision(12, 2);

            builder.Property(o => o.DeliveryFee)
                .IsRequired()
                .HasPrecision(12, 2);

            builder.Property(o => o.TotalAmount)
                .IsRequired()
                .HasPrecision(12, 2);

            builder.Property(o => o.Status)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.HasOne(o => o.Customer)
                .WithMany()
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(o => o.Courier)
                .WithMany()
                .HasForeignKey(o => o.CourierId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(o => o.CustomerAddress)
                .WithMany()
                .HasForeignKey(o => o.CustomerAddressId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Property(o => o.OrderNumber)
                .HasMaxLength(30);

            builder.HasIndex(o => o.OrderNumber)
                .IsUnique();

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
                    .HasMaxLength(100)
                    .IsRequired();

                a.Property(p => p.Label)
                    .HasColumnName("DeliveryLabel")
                    .HasMaxLength(50);

                a.Property(p => p.Note)
                    .HasColumnName("DeliveryNote")
                    .HasMaxLength(500);
            });

            builder.Property(o => o.PaymentMethod)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(o => o.PaymentStatus)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(o => o.DeliveryContactPhoneNumber)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(o => o.AcceptedAt);

            builder.Property(o => o.RejectedAt);

            builder.Property(o => o.ReadyForPickupAt);

            builder.Property(o => o.DeliveryStartedAt);

            builder.Property(o => o.DeliveredAt);

            builder.Navigation(o => o.DeliveryAddress)
                .IsRequired();

            builder.HasMany(o => o.StatusHistory)
                .WithOne(h => h.Order)
                .HasForeignKey(h => h.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(o => o.CustomerId);
            builder.HasIndex(o => o.CourierId);
            builder.HasIndex(o => o.Status);
            builder.HasIndex(o => o.PaymentMethod);
            builder.HasIndex(o => o.PaymentStatus);
            builder.HasIndex(o => o.CreatedAt);
            builder.HasIndex(o => o.AcceptedAt);
            builder.HasIndex(o => o.RejectedAt);
            builder.HasIndex(o => o.ReadyForPickupAt);
            builder.HasIndex(o => o.DeliveryStartedAt);
            builder.HasIndex(o => o.DeliveredAt);

            builder.ToTable("Orders", t =>
            {
                t.HasCheckConstraint(
                    "CK_Order_Subtotal_NonNegative",
                    "\"Subtotal\" >= 0"
                );

                t.HasCheckConstraint(
                    "CK_Order_DeliveryFee_NonNegative",
                    "\"DeliveryFee\" >= 0"
                );

                t.HasCheckConstraint(
                    "CK_Order_TotalAmount_NonNegative",
                    "\"TotalAmount\" >= 0"
                );
            });
        }
    }
}