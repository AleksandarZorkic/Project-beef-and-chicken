using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryContactPhoneNumberToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeliveryContactPhoneNumber",
                table: "Orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryContactPhoneNumber",
                table: "Orders");
        }
    }
}
