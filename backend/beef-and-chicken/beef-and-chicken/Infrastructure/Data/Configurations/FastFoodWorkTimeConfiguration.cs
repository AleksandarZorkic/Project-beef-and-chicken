using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class FastFoodWorkTimeConfiguration : IEntityTypeConfiguration<FastFoodWorkTime>
    {
        public void Configure(EntityTypeBuilder<FastFoodWorkTime> builder)
        {
            builder.HasKey(x => x.Id);

            builder.HasIndex(x => x.DayOfWeek).IsUnique();

            builder.Property(x => x.IsClosed).HasDefaultValue(false);

            builder.Property(x => x.ClosesNextDay).HasDefaultValue(false);

            builder.ToTable(x =>
            {
                x.HasCheckConstraint("CK_FastFoodWorkTime_DayOfWeek_Range",
                    "\"DayOfWeek\" BETWEEN 0 AND 6");

                x.HasCheckConstraint(
                   "CK_FastFoodWorkTime_TimeRange",
                   "\"IsClosed\" = TRUE OR " +
                   "(\"OpenTime\" <> \"CloseTime\" AND " +
                   "((\"ClosesNextDay\" = FALSE AND \"OpenTime\" < \"CloseTime\") OR " +
                   "(\"ClosesNextDay\" = TRUE  AND \"OpenTime\" > \"CloseTime\")))"
                 );
            });
        }
    }
}
