using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RePrompt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Prompts",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Prompts");
        }
    }
}
