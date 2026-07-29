using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentMethodAndStatusToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Orders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Cash");

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "Orders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PaymentMethod",
                table: "Orders",
                column: "PaymentMethod");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PaymentStatus",
                table: "Orders",
                column: "PaymentStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_PaymentMethod",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_PaymentStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "Orders");
        }
    }
}
