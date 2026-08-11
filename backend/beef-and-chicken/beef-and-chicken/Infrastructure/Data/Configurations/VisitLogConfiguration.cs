using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class VisitLogConfiguration : IEntityTypeConfiguration<VisitLog>
    {
        public void Configure(EntityTypeBuilder<VisitLog> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.VisitorId)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.VisitorType)
                .IsRequired()
                .HasMaxLength(30);

            builder.Property(x => x.Path)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(x => x.VisitedAtUtc)
                .IsRequired();

            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => x.VisitedAtUtc);

            builder.HasIndex(x => x.Path);

            builder.HasIndex(x => x.VisitorId);

            builder.HasIndex(x => new
            {
                x.VisitorType,
                x.VisitedAtUtc
            });
        }
    }
}