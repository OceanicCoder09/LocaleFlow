namespace LocaleFlow.Api.Models
{
    public class ProjectMember
    {
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public ProjectRole Role { get; set; } = ProjectRole.Viewer;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
