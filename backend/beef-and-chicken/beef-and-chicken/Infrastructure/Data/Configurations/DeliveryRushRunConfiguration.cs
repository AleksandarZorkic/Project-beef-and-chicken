using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class DeliveryRushRunConfiguration
        : IEntityTypeConfiguration<DeliveryRushRun>
    {
        public void Configure(EntityTypeBuilder<DeliveryRushRun> builder)
        {
            builder.ToTable("DeliveryRushRuns");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.GameVersion)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.WeekStartDate)
                .HasColumnType("date")
                .IsRequired();

            builder.HasOne(x => x.User)
                .WithMany(x => x.DeliveryRushRuns)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new
            {
                x.WeekStartDate,
                x.Status,
                x.Score
            });

            builder.HasIndex(x => new
            {
                x.UserId,
                x.WeekStartDate
            });

            builder.HasIndex(x => x.UserId)
            .HasDatabaseName(
                "UX_DeliveryRushRuns_UserId_Started")
            .IsUnique()
            .HasFilter("\"Status\" = 'Started'");
        }
    }
}