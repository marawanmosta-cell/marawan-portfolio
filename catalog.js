window.portfolioCatalogReady = (async () => {
  const params = new URLSearchParams(location.search);
  const published = window.portfolioOrder?.$catalog || {};
  const main = document.querySelector(".project-stack");
  const projectTabs = document.querySelector(".project-index .project-tabs");
  const catalog = structuredClone(published);
  catalog.labels ||= {};
  catalog.brands ||= [];
  catalog.sections ||= [];
  catalog.images ||= {};
  catalog.projectLinks ||= {};

  function element(tag, name, text) {
    const node = document.createElement(tag);
    if (name) node.className = name;
    if (text) node.textContent = text;
    return node;
  }

  function button(text, action) {
    const node = element("button", "", text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function addTab(list, panel, name) {
    const tab = element("button", "", name);
    tab.type = "button";
    tab.id = panel.id + "-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = -1;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    panel.hidden = true;
    list.append(tab);
  }

  function createGallery(panel) {
    const empty = panel.querySelector(":scope > .empty-gallery");
    empty?.remove();
    const grid = element("div", "image-grid");
    panel.append(grid);
    return grid;
  }

  for (const { id, name } of catalog.brands) {
    if (document.getElementById(id)) continue;
    const project = element("section", "project");
    project.id = id;
    const header = element("div", "project-header");
    header.append(element("h1", "", name));
    project.append(header);
    createGallery(project);
    addTab(projectTabs, project, name);
    main.append(project);
  }

  const gardens = document.getElementById("gardens-gallery");
  if (!gardens.querySelector(".image-grid")) createGallery(gardens);

  function sectionsFor(brand) {
    let list = brand.querySelector(".collection-tabs");
    if (list) return list;
    list = element("div", "project-tabs collection-tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Project sections");
    brand.querySelector(".project-header").after(list);

    const grid = brand.querySelector(":scope > .image-grid");
    if (grid?.children.length || Object.keys(catalog.images[brand.id] || {}).length) {
      const panel = element("section", "collection");
      panel.id = brand.id + "-overview";
      grid.dataset.galleryId = brand.id;
      panel.append(grid);
      addTab(list, panel, "Overview");
      brand.append(panel);
    } else {
      grid?.remove();
    }
    brand.querySelector(".project-meta")?.remove();
    return list;
  }

  for (const { id, brand: brandId, name } of catalog.sections) {
    const brand = document.getElementById(brandId);
    if (!brand?.classList.contains("project") || document.getElementById(id)) continue;
    const list = sectionsFor(brand);
    const panel = element("section", "collection");
    panel.id = id;
    createGallery(panel);
    addTab(list, panel, name);
    brand.append(panel);
  }

  function selectInitial(list, id) {
    const tabs = [...list.children];
    const active = tabs.find(tab => tab.getAttribute("aria-controls") === id) ||
      tabs.find(tab => tab.getAttribute("aria-selected") === "true") || tabs[0];
    for (const tab of tabs) {
      tab.setAttribute("aria-selected", String(tab === active));
      tab.tabIndex = tab === active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = tab !== active;
    }
  }

  selectInitial(projectTabs, params.get("brand"));
  for (const list of main.querySelectorAll(".collection-tabs")) {
    selectInitial(list, params.get("section"));
    if (list.children.length > 2) {
      const strip = element("div", "collection-tab-strip");
      list.before(strip);
      strip.append(list);
    }
  }

  if (catalog.labels.site) {
    document.querySelector(".wordmark").textContent = catalog.labels.site;
    document.title = catalog.labels.site + " — Selected Work";
  }
  for (const panel of main.querySelectorAll('[role="tabpanel"]')) {
    const label = catalog.labels[panel.id];
    if (!label) continue;
    document.getElementById(panel.getAttribute("aria-labelledby")).textContent = label;
    if (panel.classList.contains("project")) panel.querySelector("h1").textContent = label;
  }

  const artworkUrl = async filename => filename;

  function behanceUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && ["www.behance.net", "behance.net"].includes(url.host) &&
          !url.username && !url.password && /^\/gallery\/\d+(?:\/|$)/.test(url.pathname)) return url.href;
    } catch {}
    return "";
  }

  for (const feature of main.querySelectorAll(".project-feature")) {
    const project = feature.closest(".project");
    const cover = feature.querySelector(".project-cover");
    const link = feature.querySelector(".behance-link");
    const summary = feature.querySelector(".project-summary");
    cover.setAttribute("aria-label", "View " + project.querySelector("h1").textContent + " on Behance");
    const details = catalog.projectLinks[project.id];
    if (!details) continue;
    summary.textContent = details.summary;
    const url = behanceUrl(details.url);
    if (url) cover.href = link.href = url;
    if (details.files) {
      const image = cover.querySelector("img");
      const { full, wide, small, width, height } = details.files;
      const [fullUrl, wideUrl, smallUrl] = await Promise.all([full, wide, small].map(artworkUrl));
      image.srcset = smallUrl + " 480w, " + wideUrl + " 900w, " + fullUrl + " " + width + "w";
      image.sizes = "(max-width: 700px) 95vw, 58vw";
      if (width <= 900) image.removeAttribute("srcset");
      image.src = fullUrl;
      image.width = width;
      image.height = height;
      cover.hidden = false;
    }
  }

  function createPoster(id) {
    const poster = element("button", "poster");
    poster.type = "button";
    const picture = element("picture", "poster-image");
    const image = document.createElement("img");
    image.loading = "lazy";
    image.decoding = "async";
    picture.append(image);
    const caption = element("span", "poster-caption");
    const arrow = element("span", "poster-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    caption.append(element("span", "poster-title"), arrow);
    poster.append(picture, caption);
    poster.dataset.artworkId = id;
    return poster;
  }

  function artworkId(poster) {
    return poster.dataset.artworkId || new URL(poster.querySelector("img").dataset.full, document.baseURI)
      .pathname.split("/").at(-1).replace(/\.webp$/, "");
  }

  async function applyArtwork(grid, galleryId, id, value, builtIn) {
    let poster = builtIn.get(id);
    if (!poster) {
      if (!value.files) return;
      poster = createPoster(id);
      grid.append(poster);
    }
    const image = poster.querySelector("img");
    poster.dataset.artworkId = id;
    poster.setAttribute("aria-label", "View " + value.caption);
    poster.querySelector(".poster-title").textContent = value.caption;
    image.alt = value.alt;
    if (!value.files) return;

    const { full, wide, small, width, height } = value.files;
    const [fullUrl, wideUrl, smallUrl] = await Promise.all([full, wide, small].map(artworkUrl));
    const picture = poster.querySelector(".poster-image");
    picture.querySelector("source")?.remove();
    const source = document.createElement("source");
    source.media = "(max-width: 640px)";
    source.srcset = smallUrl + " 1x, " + wideUrl + " 2x";
    picture.prepend(source);
    image.srcset = wideUrl + " 1x, " + fullUrl + " 2x";
    image.removeAttribute("sizes");
    image.src = wideUrl;
    image.dataset.full = fullUrl;
    image.width = width;
    image.height = height;
  }

  for (const grid of main.querySelectorAll(".image-grid")) {
    const galleryId = grid.dataset.galleryId || grid.closest('[role="tabpanel"]').id;
    const builtIn = new Map([...grid.children].map(poster => [artworkId(poster), poster]));
    // Attach existing assets in deterministic order, even if their blob reads finish out of order.
    await Promise.all(Object.entries(catalog.images[galleryId] || {}).map(([id, value]) =>
      applyArtwork(grid, galleryId, id, value, builtIn)
    ));
  }

  window.portfolioEditor = { artworkId };
})();
