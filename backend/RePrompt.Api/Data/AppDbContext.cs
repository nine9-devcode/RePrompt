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
    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Prompt>()
            .HasMany(p => p.Images)
            .WithOne(i => i.Prompt)
            .HasForeignKey(i => i.PromptId)
            .OnDelete(DeleteBehavior.Cascade);

        // Join table is implicit: tags themselves outlive the prompts that use them, so
        // deleting a prompt only removes the link rows.
        modelBuilder.Entity<Prompt>()
            .HasMany(p => p.Tags)
            .WithMany(t => t.Prompts)
            .UsingEntity("PromptTags");
    }
}
