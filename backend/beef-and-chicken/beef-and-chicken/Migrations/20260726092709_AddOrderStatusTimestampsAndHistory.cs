using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace beef_and_chicken.Infrastucture.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderStatusTimestampsAndHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveredAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveryStartedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadyForPickupAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrderStatusHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    OldStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NewStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ChangedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistories_AspNetUsers_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistories_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_AcceptedAt",
                table: "Orders",
                column: "AcceptedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_DeliveredAt",
                table: "Orders",
                column: "DeliveredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_DeliveryStartedAt",
                table: "Orders",
                column: "DeliveryStartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ReadyForPickupAt",
                table: "Orders",
                column: "ReadyForPickupAt");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RejectedAt",
                table: "Orders",
                column: "RejectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_ChangedAt",
                table: "OrderStatusHistories",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_ChangedByUserId",
                table: "OrderStatusHistories",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_NewStatus",
                table: "OrderStatusHistories",
                column: "NewStatus");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_OrderId",
                table: "OrderStatusHistories",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderStatusHistories");

            migrationBuilder.DropIndex(
                name: "IX_Orders_AcceptedAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_DeliveredAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_DeliveryStartedAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ReadyForPickupAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_RejectedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AcceptedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveredAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryStartedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReadyForPickupAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "Orders");
        }
    }
}
