using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RestaurantSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    MinimumOrderAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false, defaultValue: 800m),
                    DeliveryFee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false, defaultValue: 200m),
                    FreeDeliveryThreshold = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    IsDeliveryEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantSettings", x => x.Id);
                    table.CheckConstraint("CK_RestaurantSettings_DeliveryFee_NonNegative", "\"DeliveryFee\" >= 0");
                    table.CheckConstraint("CK_RestaurantSettings_FreeDeliveryThreshold_Positive", "\"FreeDeliveryThreshold\" IS NULL OR \"FreeDeliveryThreshold\" > 0");
                    table.CheckConstraint("CK_RestaurantSettings_MinimumOrderAmount_NonNegative", "\"MinimumOrderAmount\" >= 0");
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RestaurantSettings");
        }
    }
}
