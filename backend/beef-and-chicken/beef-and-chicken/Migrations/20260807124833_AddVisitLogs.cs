using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddVisitLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VisitLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VisitorId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    VisitorType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VisitedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VisitLogs_Path",
                table: "VisitLogs",
                column: "Path");

            migrationBuilder.CreateIndex(
                name: "IX_VisitLogs_UserId",
                table: "VisitLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitLogs_VisitedAtUtc",
                table: "VisitLogs",
                column: "VisitedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_VisitLogs_VisitorId",
                table: "VisitLogs",
                column: "VisitorId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitLogs_VisitorType_VisitedAtUtc",
                table: "VisitLogs",
                columns: new[] { "VisitorType", "VisitedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VisitLogs");
        }
    }
}
