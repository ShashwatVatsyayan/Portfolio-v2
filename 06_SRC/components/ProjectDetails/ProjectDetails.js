/**
 * ProjectDetails — Editorial Detail Panel Controller
 * Synchronized with the 3D CircularCarousel.
 * Handles smooth 450ms crossfade/slide transitions of project metadata.
 */

export class ProjectDetails {
  constructor(containerEl, initialProject) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) {
      console.error('[ProjectDetails] Container not found.');
      return;
    }

    this.contentEl = this.container.querySelector('.details-content');
    this.numEl = this.container.querySelector('.details-number');
    this.catEl = this.container.querySelector('.details-category');
    this.titleEl = this.container.querySelector('.details-title');
    this.descEl = this.container.querySelector('.details-description');
    this.metricsEl = this.container.querySelector('.details-metrics');
    this.techListEl = this.container.querySelector('.details-tech-list');
    this.viewBtn = this.container.querySelector('.action-btn--primary');
    this.githubBtn = this.container.querySelector('.action-btn--secondary');

    this.currentProject = null;
    this.isTransitioning = false;
    this.pendingProject = null;

    if (initialProject) {
      this.render(initialProject, false);
    }
  }

  update(project) {
    if (!project || (this.currentProject && this.currentProject.id === project.id)) return;

    if (this.isTransitioning) {
      this.pendingProject = project;
      return;
    }

    this.isTransitioning = true;
    this.contentEl.classList.add('is-transitioning');

    setTimeout(() => {
      this.render(project, true);
      this.contentEl.classList.remove('is-transitioning');
      this.isTransitioning = false;

      if (this.pendingProject) {
        const next = this.pendingProject;
        this.pendingProject = null;
        this.update(next);
      }
    }, 220);
  }

  render(project, animated = true) {
    this.currentProject = project;

    if (this.numEl) this.numEl.textContent = `${project.number} / 05`;
    if (this.catEl) this.catEl.textContent = project.category;
    if (this.titleEl) this.titleEl.textContent = project.title;
    if (this.descEl) this.descEl.textContent = project.longDescription || project.description;
    if (this.metricsEl) this.metricsEl.textContent = project.metrics || project.subtitle;

    // Technologies tags
    if (this.techListEl && Array.isArray(project.technologies)) {
      this.techListEl.innerHTML = project.technologies
        .map(tech => `<span class="tech-tag">${tech}</span>`)
        .join('');
    }

    // Links (default to editable '#' placeholders)
    if (this.viewBtn) {
      this.viewBtn.href = project.url || '#';
      if (project.url && project.url !== '#') {
        this.viewBtn.removeAttribute('title');
        this.viewBtn.setAttribute('target', '_blank');
        this.viewBtn.setAttribute('rel', 'noopener noreferrer');
      } else {
        this.viewBtn.setAttribute('title', 'Project link placeholder (ready for live URL)');
      }
    }

    if (this.githubBtn) {
      this.githubBtn.href = project.github || '#';
      if (project.github && project.github !== '#') {
        this.githubBtn.removeAttribute('title');
        this.githubBtn.setAttribute('target', '_blank');
        this.githubBtn.setAttribute('rel', 'noopener noreferrer');
      } else {
        this.githubBtn.setAttribute('title', 'GitHub link placeholder (ready for repository URL)');
      }
    }
  }
}
