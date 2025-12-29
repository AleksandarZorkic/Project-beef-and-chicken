using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class EmployeeWorkTimeConfiguration : IEntityTypeConfiguration<EmployeeWorkTime>
    {
        public void Configure(EntityTypeBuilder<EmployeeWorkTime> builder)
        {
            builder.HasKey(x => x.Id);

            builder.HasOne(x => x.User)
                .WithMany(x => x.EmployeeWorkTimes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.UserId, x.DayOfWeek })
                .IsUnique();

            builder.Property(x => x.IsOffDay)
                .HasDefaultValue(false);

            builder.ToTable(x =>
            {
                x.HasCheckConstraint("CK_EmployeeWorkTime_TimeRange",
                "\"StartTime\" < \"EndTime\" OR \"IsOffDay\" = TRUE");

                x.HasCheckConstraint("CK_EmployeeWorkTime_TimeRange",
                    "\"IsOffDay\" = TRUE OR \"StartTime\" < \"EndTime\""
                    );
            });
        }
    }
}
