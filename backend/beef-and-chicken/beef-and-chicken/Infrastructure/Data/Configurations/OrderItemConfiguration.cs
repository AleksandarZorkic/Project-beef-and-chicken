using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.HasKey(x => new { x.OrderId, x.DishId });

            builder.HasOne(x => x.Order)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Dish)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.DishId);

            builder.Property(x => x.Quantity).IsRequired();
            builder.Property(x => x.UnitPrice).IsRequired().HasPrecision(12,2);

            builder.ToTable("OrderItems");

            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_OrderItem_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_OrderItem_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
            });
        }
    }
}
