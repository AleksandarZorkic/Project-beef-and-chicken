using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueActiveDeliveryRushRun : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "DeliveryRushRuns"
                SET
                    "Status" = 'Expired',
                    "FinishedAtUtc" = COALESCE(
                        "FinishedAtUtc",
                        "ExpiresAtUtc")
                WHERE
                    "Status" = 'Started'
                    AND "ExpiresAtUtc" <= NOW();

                WITH ranked_runs AS
                (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER
                        (
                            PARTITION BY "UserId"
                            ORDER BY "StartedAtUtc" DESC, "Id" DESC
                        ) AS row_number
                    FROM "DeliveryRushRuns"
                    WHERE "Status" = 'Started'
                )
                UPDATE "DeliveryRushRuns" AS run
                SET
                    "Status" = 'Expired',
                    "FinishedAtUtc" = COALESCE(
                        run."FinishedAtUtc",
                        run."ExpiresAtUtc")
                FROM ranked_runs
                WHERE
                    run."Id" = ranked_runs."Id"
                    AND ranked_runs.row_number > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "UX_DeliveryRushRuns_UserId_Started",
                table: "DeliveryRushRuns",
                column: "UserId",
                unique: true,
                filter: "\"Status\" = 'Started'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_DeliveryRushRuns_UserId_Started",
                table: "DeliveryRushRuns");
        }
    }
}
