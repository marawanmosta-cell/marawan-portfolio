window.portfolioCatalogReady.then(() => {
  const header = document.querySelector(".site-header");
  const modeLink = header.querySelector(".portfolio-mode");
  const modeUrl = new URL(location.href);
  const { editing, previewing } = window.portfolioEditor;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  modeLink.dataset.portfolioMode = editing ? "live" : "1";
  if (editing || previewing) {
    modeLink.textContent = editing ? "View live" : "Back to edit";
    modeLink.removeAttribute("aria-label");
  }
  const modeLinks = document.querySelectorAll("[data-portfolio-mode]");

  function updateModeLink() {
    const active = '[role="tab"][aria-selected="true"]';
    const brand = header.querySelector(active).getAttribute("aria-controls");
    const section = document.getElementById(brand).querySelector(active)?.getAttribute("aria-controls");
    modeUrl.searchParams.set("brand", brand);
    if (section) modeUrl.searchParams.set("section", section);
    else modeUrl.searchParams.delete("section");
    modeUrl.hash = ["#billboards", "#gardens-campaign"].includes(location.hash) && section !== "gardens-gallery" ? "" : location.hash;
    for (const link of modeLinks) {
      const mode = link.dataset.portfolioMode;
      if (mode === "live") modeUrl.searchParams.delete("arrange");
      else modeUrl.searchParams.set("arrange", mode);
      link.href = modeUrl.href;
    }
  }

  function setupTabs(tablist, isProjectList = false) {
    const tabs = [...tablist.children];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
    let selected = tabs.find(tab => tab.getAttribute("aria-selected") === "true");
    tablist.style.setProperty("--tab-count", tabs.length);
    tablist.style.setProperty("--active-tab", tabs.indexOf(selected));
    let transition;
    let appearance;

    function showPanel(tab) {
      tablist.style.setProperty("--active-tab", tabs.indexOf(tab));
      tabs.forEach((item, i) => {
        const active = item === tab;
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      updateModeLink();
    }

    function selectTab(tab, byPointer) {
      if (tab === selected) return;
      selected = tab;
      transition?.skipTransition();
      appearance?.cancel();
      const animate = byPointer && !reducedMotion.matches;
      const nearTop = window.scrollY < header.offsetHeight;
      const panel = panels[tabs.indexOf(tab)];

      if (animate && isProjectList && nearTop && document.startViewTransition &&
          getComputedStyle(panel).viewTransitionName !== "none") {
        transition = document.startViewTransition(() => {
          if (selected === tab) showPanel(tab);
        });
        return;
      }

      showPanel(tab);
      if (isProjectList && !nearTop) window.scrollTo({ top: 0, behavior: "instant" });
      if (animate) {
        appearance = panel.animate(
          [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
          { duration: 210, easing: "cubic-bezier(.23, 1, .32, 1)" }
        );
      }
    }

    tabs.forEach(tab => tab.addEventListener("click", event => selectTab(tab, event.detail > 0)));
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
      selectTab(next, false);
      next.focus();
    });
  }

  setupTabs(header.querySelector('[role="tablist"]'), true);
  document.querySelectorAll(".collection-tabs").forEach(tablist => setupTabs(tablist));
  updateModeLink();
  window.addEventListener("hashchange", updateModeLink);

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
    if (!poster || poster.draggable) return;
    const gallery = poster.closest(".image-grid");
    const panel = gallery.closest('[role="tabpanel"]');
    const label = gallery.getAttribute("aria-labelledby") || panel.getAttribute("aria-labelledby");
    const name = document.getElementById(label).textContent;
    posters = [...gallery.querySelectorAll(".poster")];
    viewer.classList.toggle("viewer-brochure", panel.classList.contains("brochure-gallery"));
    viewer.setAttribute("aria-label", name + " artwork");
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
});
