(() => {
  const frame = document.getElementById("marawan-projects");
  const stack = frame.querySelector(".project-stack");
  const index = [...frame.querySelectorAll("[data-project-link]")];
  const projects = [...stack.children].map(section => ({
    section,
    toggle: section.querySelector(".project-toggle"),
    gallery: section.querySelector(".project-gallery")
  }));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = projects[0];
  let selected = active;
  let transition;

  function updateProject(project, source) {
    const restoreFocus = document.activeElement === source && source === project.toggle;
    active = project;

    for (const item of projects) {
      const expanded = item === project;
      item.toggle.setAttribute("aria-expanded", String(expanded));
      item.gallery.hidden = !expanded;
    }
    for (const link of index) {
      link.setAttribute("aria-pressed", String(link.dataset.projectLink === project.section.dataset.project));
    }
    stack.prepend(project.section);
    if (restoreFocus) source.focus({ preventScroll: true });
    if (project.toggle.getBoundingClientRect().top < 0) {
      project.toggle.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }

  function selectProject(project, event) {
    if (selected === project) return;
    selected = project;
    const source = event.currentTarget;
    transition?.skipTransition();

    const move = event.detail > 0 && !reducedMotion.matches;
    if (move && document.startViewTransition && stack.getBoundingClientRect().top >= 0) {
      transition = document.startViewTransition(() => {
        if (selected === project && active !== project) updateProject(project, source);
      });
      return;
    }

    updateProject(project, source);
    if (move && project.gallery.animate) {
      project.gallery.animate(
        [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: "cubic-bezier(.23, 1, .32, 1)" }
      );
    }
  }

  for (const project of projects) {
    project.toggle.addEventListener("click", event => selectProject(project, event));
  }
  for (const link of index) {
    const project = projects.find(item => item.section.dataset.project === link.dataset.projectLink);
    link.addEventListener("click", event => selectProject(project, event));
  }

  const viewer = frame.querySelector(".viewer");
  const image = viewer.querySelector(".viewer-image");
  const caption = viewer.querySelector(".viewer-caption");
  const position = viewer.querySelector(".viewer-position");
  let posters = [];
  let current = 0;
  let imageRequest = 0;

  function showArtwork(i) {
    current = (i + posters.length) % posters.length;
    const poster = posters[current];
    const thumbnail = poster.querySelector("img");
    image.src = thumbnail.src;
    image.alt = thumbnail.alt;
    caption.textContent = poster.dataset.caption;
    position.textContent = `${current + 1} / ${posters.length}`;

    const request = ++imageRequest;
    const full = new Image();
    full.src = thumbnail.dataset.full;
    full.decode().then(() => {
      if (viewer.open && imageRequest === request) image.src = full.src;
    }).catch(() => {});
  }

  stack.addEventListener("click", event => {
    const poster = event.target.closest(".poster");
    if (!poster) return;
    posters = [...poster.closest(".project-gallery").querySelectorAll(".poster")];
    const name = poster.closest(".project").querySelector(".project-name").textContent;
    viewer.setAttribute("aria-label", `${name} artwork`);
    showArtwork(posters.indexOf(poster));
    viewer.showModal();
  });
  viewer.querySelectorAll("[data-step]").forEach(button => button.addEventListener("click", () => {
    showArtwork(current + Number(button.dataset.step));
  }));
  viewer.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") showArtwork(current - 1);
    if (event.key === "ArrowRight") showArtwork(current + 1);
  });
})();
