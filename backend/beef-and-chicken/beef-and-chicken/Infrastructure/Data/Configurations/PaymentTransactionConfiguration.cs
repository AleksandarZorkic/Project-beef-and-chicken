using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class PaymentTransactionConfiguration
        : IEntityTypeConfiguration<PaymentTransaction>
    {
        public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
        {
            builder.ToTable("PaymentTransactions");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Provider)
                .HasConversion<string>()
                .HasMaxLength(40)
                .IsRequired();

            builder.Property(x => x.ProviderTransactionId)
                .HasMaxLength(200);

            builder.Property(x => x.Amount)
                .HasPrecision(18, 2)
                .IsRequired();

            builder.Property(x => x.Currency)
                .HasMaxLength(3)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.RedirectUrl)
                .HasMaxLength(2048);

            builder.Property(x => x.FailureReason)
                .HasMaxLength(500);

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.Property(x => x.PaidAtUtc);

            builder.Property(x => x.FailedAtUtc);

            builder.HasOne(x => x.Order)
                .WithMany(x => x.PaymentTransactions)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.OrderId);

            builder.HasIndex(x => x.Provider);

            builder.HasIndex(x => x.Status);

            builder.HasIndex(x => x.CreatedAtUtc);

            builder.HasIndex(x => new
            {
                x.Provider,
                x.ProviderTransactionId
            })
            .IsUnique();
        }
    }
}