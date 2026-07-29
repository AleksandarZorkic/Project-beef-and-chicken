using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class BackfillPaymentMethodAndStatusOnOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Orders"
                ALTER COLUMN "PaymentMethod" SET DEFAULT 'Cash';
            """);

                    migrationBuilder.Sql("""
                ALTER TABLE "Orders"
                ALTER COLUMN "PaymentStatus" SET DEFAULT 'Pending';
            """);

                    migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "PaymentMethod" = 'Cash'
                WHERE "PaymentMethod" IS NULL OR "PaymentMethod" = '';
            """);

                    migrationBuilder.Sql("""
                UPDATE "Orders"
                SET "PaymentStatus" = CASE
                    WHEN "Status" = 'Dostavljena' THEN 'Paid'
                    WHEN "Status" = 'Odbijena' THEN 'Cancelled'
                    ELSE 'Pending'
                END
                WHERE "PaymentStatus" IS NULL OR "PaymentStatus" = '';
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Orders"
                ALTER COLUMN "PaymentMethod" SET DEFAULT '';
            """);

                    migrationBuilder.Sql("""
                ALTER TABLE "Orders"
                ALTER COLUMN "PaymentStatus" SET DEFAULT '';
            """);
        }
    }
}
