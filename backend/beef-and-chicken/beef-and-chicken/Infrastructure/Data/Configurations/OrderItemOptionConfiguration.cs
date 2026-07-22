using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class OrderItemOptionConfiguration : IEntityTypeConfiguration<OrderItemOption>
    {
        public void Configure(EntityTypeBuilder<OrderItemOption> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.OptionName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.OptionType)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.UnitPrice)
                .IsRequired()
                .HasPrecision(12, 2);

            builder.HasOne(x => x.OrderItem)
                .WithMany(x => x.Options)
                .HasForeignKey(x => x.OrderItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.DishOption)
                .WithMany()
                .HasForeignKey(x => x.DishOptionId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => x.OrderItemId);
            builder.HasIndex(x => x.DishOptionId);

            builder.ToTable("OrderItemOptions", t =>
            {
                t.HasCheckConstraint(
                    "CK_OrderItemOption_UnitPrice_NonNegative",
                    "\"UnitPrice\" >= 0"
                );
            });
        }
    }
}