using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RePrompt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Prompts_Category",
                table: "Prompts",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Prompts_CreatedAt",
                table: "Prompts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Prompts_ModelName",
                table: "Prompts",
                column: "ModelName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Prompts_Category",
                table: "Prompts");

            migrationBuilder.DropIndex(
                name: "IX_Prompts_CreatedAt",
                table: "Prompts");

            migrationBuilder.DropIndex(
                name: "IX_Prompts_ModelName",
                table: "Prompts");
        }
    }
}
