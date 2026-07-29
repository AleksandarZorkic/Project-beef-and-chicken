using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddRecommendedDishes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Dishes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<bool>(
                name: "IsRecommended",
                table: "Dishes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "RecommendedSortOrder",
                table: "Dishes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Dishes_IsRecommended",
                table: "Dishes",
                column: "IsRecommended");

            migrationBuilder.CreateIndex(
                name: "IX_Dishes_RecommendedSortOrder",
                table: "Dishes",
                column: "RecommendedSortOrder");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Dish_RecommendedSortOrder_NonNegative",
                table: "Dishes",
                sql: "\"RecommendedSortOrder\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Dishes_IsRecommended",
                table: "Dishes");

            migrationBuilder.DropIndex(
                name: "IX_Dishes_RecommendedSortOrder",
                table: "Dishes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Dish_RecommendedSortOrder_NonNegative",
                table: "Dishes");

            migrationBuilder.DropColumn(
                name: "IsRecommended",
                table: "Dishes");

            migrationBuilder.DropColumn(
                name: "RecommendedSortOrder",
                table: "Dishes");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Dishes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);
        }
    }
}
