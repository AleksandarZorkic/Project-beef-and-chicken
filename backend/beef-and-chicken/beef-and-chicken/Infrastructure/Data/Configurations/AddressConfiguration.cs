using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace beef_and_chicken.Infrastructure.Data.Configurations
{
    public class AddressConfiguration : IEntityTypeConfiguration<Address>
    {
        public void Configure(EntityTypeBuilder<Address> builder)
        {
            builder.Property(a => a.Street)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(a => a.HouseNumber)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(a => a.PostalCode)
                .HasMaxLength(20);

            builder.Property(a => a.City)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(a => a.Label)
                .HasMaxLength(50);

            builder.Property(a => a.Note)
                .HasMaxLength(200);

            builder.HasOne(a => a.Customer)
                .WithMany(c => c.Addresses)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
