(() => {
  const header = document.querySelector(".site-header");
  const tablist = header.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let selected = tabs[0];
  let transition;

  function showProject(tab) {
    tabs.forEach((item, i) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
  }

  function selectProject(tab, byPointer) {
    if (tab === selected) return;
    selected = tab;
    transition?.skipTransition();
    const animate = byPointer && !reducedMotion.matches;
    const nearTop = window.scrollY < header.offsetHeight;

    if (animate && nearTop && document.startViewTransition) {
      transition = document.startViewTransition(() => {
        if (selected === tab) showProject(tab);
      });
      return;
    }

    showProject(tab);
    if (!nearTop) window.scrollTo({ top: 0, behavior: "instant" });
    if (animate) {
      const panel = panels[tabs.indexOf(tab)];
      panel.animate(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 210, easing: "cubic-bezier(.23, 1, .32, 1)" }
      );
    }
  }

  tabs.forEach(tab => tab.addEventListener("click", event => selectProject(tab, event.detail > 0)));
  tablist.addEventListener("keydown", event => {
    const focusedIndex = tabs.indexOf(event.target);
    if (focusedIndex < 0) return;
    const targets = {
      ArrowLeft: (focusedIndex + tabs.length - 1) % tabs.length,
      ArrowRight: (focusedIndex + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    const next = tabs[targets[event.key]];
    selectProject(next, false);
    next.focus();
  });

  const viewer = document.querySelector(".viewer");
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
    image.src = thumbnail.currentSrc || thumbnail.src;
    image.alt = thumbnail.alt;
    caption.textContent = poster.querySelector(".poster-title").textContent;
    position.textContent = (current + 1) + " / " + posters.length;

    const request = ++imageRequest;
    if (!thumbnail.dataset.full) return;
    const full = new Image();
    full.src = thumbnail.dataset.full;
    full.decode().then(() => {
      if (viewer.open && imageRequest === request) image.src = full.src;
    }).catch(() => {});
  }

  document.querySelector(".project-stack").addEventListener("click", event => {
    const poster = event.target.closest(".poster");
    if (!poster) return;
    const project = poster.closest(".project");
    posters = [...project.querySelectorAll(".poster")];
    viewer.setAttribute("aria-label", project.querySelector("h1").textContent + " artwork");
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
