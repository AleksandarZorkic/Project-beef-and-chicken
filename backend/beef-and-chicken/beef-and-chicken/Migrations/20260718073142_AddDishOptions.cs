using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddDishOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DishOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    IsAlwaysPaid = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DishOptions", x => x.Id);
                    table.CheckConstraint("CK_DishOption_Price_NonNegative", "\"Price\" >= 0");
                    table.CheckConstraint("CK_DishOption_SortOrder_NonNegative", "\"SortOrder\" >= 0");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DishOptions_IsActive",
                table: "DishOptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DishOptions_SortOrder",
                table: "DishOptions",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_DishOptions_Type",
                table: "DishOptions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_DishOptions_Type_Name",
                table: "DishOptions",
                columns: new[] { "Type", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DishOptions");
        }
    }
}
