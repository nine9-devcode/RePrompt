using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RePrompt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNsfwField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsNsfw",
                table: "Prompts",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsNsfw",
                table: "Prompts");
        }
    }
}
