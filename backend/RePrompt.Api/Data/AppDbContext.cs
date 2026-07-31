using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Models;

namespace RePrompt.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Prompt> Prompts => Set<Prompt>();
    public DbSet<Image> Images => Set<Image>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Additional configuration if needed
        modelBuilder.Entity<Prompt>()
            .HasMany(p => p.Images)
            .WithOne(i => i.Prompt)
            .HasForeignKey(i => i.PromptId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
