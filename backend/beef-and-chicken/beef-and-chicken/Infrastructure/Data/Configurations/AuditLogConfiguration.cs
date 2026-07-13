using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ActorUserName)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(x => x.Action)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.EntityName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.EntityId)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.IpAddress)
                .HasMaxLength(100);

            builder.Property(x => x.UserAgent)
                .HasMaxLength(500);

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.ActorUserId);

            builder.HasIndex(x => new { x.EntityName, x.EntityId });

            builder.HasIndex(x => x.Action);
        }
    }
}