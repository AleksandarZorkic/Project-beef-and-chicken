using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
    {
        public void Configure(EntityTypeBuilder<Announcement> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Title)
                .IsRequired()
                .HasMaxLength(120);

            builder.Property(x => x.Content)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(x => x.Type)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(x => x.IsPinned)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(x => x.StartsAt)
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .IsRequired();

            builder.HasIndex(x => x.IsActive);
            builder.HasIndex(x => x.IsPinned);
            builder.HasIndex(x => x.StartsAt);
            builder.HasIndex(x => x.EndsAt);
            builder.HasIndex(x => x.Type);
        }
    }
}