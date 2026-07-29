using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class OrderStatusHistoryConfiguration
        : IEntityTypeConfiguration<OrderStatusHistory>
    {
        public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.OldStatus)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.NewStatus)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.ChangedAt)
                .IsRequired();

            builder.Property(x => x.Note)
                .HasMaxLength(500);

            builder.HasOne(x => x.Order)
                .WithMany(o => o.StatusHistory)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.ChangedByUser)
                .WithMany()
                .HasForeignKey(x => x.ChangedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => x.OrderId);
            builder.HasIndex(x => x.NewStatus);
            builder.HasIndex(x => x.ChangedAt);
            builder.HasIndex(x => x.ChangedByUserId);
        }
    }
}