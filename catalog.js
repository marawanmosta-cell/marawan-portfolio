window.portfolioCatalogReady = (async () => {
  const params = new URLSearchParams(location.search);
  const editing = params.get("arrange") === "1";
  const published = window.portfolioOrder?.$catalog || {};
  const files = window.portfolioFiles;
  const base = JSON.stringify(published);
  const main = document.querySelector(".project-stack");
  const projectTabs = document.querySelector(".project-index .project-tabs");
  const editorBar = document.querySelector(".editor-bar");
  const status = editorBar.querySelector(".editor-status");
  let draft;
  let revision = 0;
  if (editing) {
    try {
      const saved = await files.readDraft();
      revision = saved?.revision || 0;
      if (saved?.base === base) draft = saved.catalog;
    } catch {
      status.textContent = "This browser could not open draft storage.";
    }
  }
  const catalog = structuredClone(draft || published);
  catalog.labels ||= {};
  catalog.brands ||= [];
  catalog.sections ||= [];
  catalog.images ||= {};

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

  function imagePaths(value) {
    return value?.files ? [value.files.full, value.files.wide, value.files.small] : [];
  }
  const publicImages = new Set(Object.values(published.images || {}).flatMap(gallery =>
    Object.values(gallery).flatMap(imagePaths)
  ));

  async function artworkUrl(filename) {
    if (draft && !publicImages.has(filename)) {
      const image = await files.readImage(filename);
      if (image) return URL.createObjectURL(image);
    }
    return filename;
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
      if (draft && !published.images?.[galleryId]?.[id]) poster.dataset.draftArtwork = "true";
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

  function configuration(galleryState) {
    return { ...galleryState, $catalog: catalog };
  }

  function textFor(galleryState) {
    return "window.portfolioOrder = " + JSON.stringify(configuration(galleryState), null, 2) + ";\n";
  }

  function pendingPaths() {
    return [...new Set(Object.values(catalog.images).flatMap(gallery =>
      Object.values(gallery).flatMap(imagePaths)
    ))].filter(filename => !publicImages.has(filename));
  }

  window.portfolioEditor = { artworkId, textFor, pendingImages: () => pendingPaths().length };

  if (!editing) return;

  editorBar.hidden = false;
  const dialog = document.querySelector(".editor-dialog");
  const form = dialog.querySelector("form");
  const nameInput = form.elements.namedItem("name");
  const fileInput = form.elements.namedItem("files");
  const altInput = form.elements.namedItem("alt");
  const saveButton = form.querySelector(".editor-save");
  const message = form.querySelector(".editor-message");
  let job;
  let busy = false;

  function open(options) {
    job = options;
    form.reset();
    form.querySelector("h2").textContent = options.title;
    form.querySelector(".editor-name").hidden = options.multiple;
    form.querySelector(".editor-file").hidden = !options.image;
    form.querySelector(".editor-alt").hidden = !options.poster;
    form.querySelector(".editor-file-label").textContent = options.poster ? "Replace image (optional)" : "Images";
    form.querySelector(".editor-preview-help").textContent = options.brochure
      ? "Gallery previews show the entire brochure image. Open it in the portfolio for a larger view."
      : "Gallery previews fill a 3:4 frame. Open the image in the portfolio to see its full composition.";
    nameInput.value = options.name || "";
    nameInput.required = !options.multiple;
    fileInput.required = Boolean(options.multiple);
    fileInput.multiple = Boolean(options.multiple);
    altInput.value = options.alt || "";
    message.textContent = "";
    dialog.showModal();
    (options.multiple ? fileInput : nameInput).focus();
  }

  function visit(brandId, sectionId, keepScroll = false) {
    const selected = projectTabs.querySelector('[aria-selected="true"]');
    const brand = brandId || selected.getAttribute("aria-controls");
    const currentSection = document.getElementById(brand)?.querySelector('.collection-tabs [aria-selected="true"]');
    const section = sectionId || currentSection?.getAttribute("aria-controls");
    const url = new URL(location.href);
    url.searchParams.set("brand", brand);
    if (section) url.searchParams.set("section", section);
    else url.searchParams.delete("section");
    if (keepScroll) {
      try { sessionStorage.setItem("portfolio-editor-scroll", String(scrollY)); } catch {}
    }
    if (url.href === location.href) location.reload();
    else location.assign(url.href);
  }

  try {
    const storedScroll = sessionStorage.getItem("portfolio-editor-scroll");
    if (storedScroll !== null) {
      sessionStorage.removeItem("portfolio-editor-scroll");
      requestAnimationFrame(() => window.scrollTo(0, Number(storedScroll)));
    }
  } catch {}

  function rename(panel) {
    const label = document.getElementById(panel.getAttribute("aria-labelledby"));
    open({
      title: panel.classList.contains("project") ? "Rename brand" : "Rename section",
      name: label.textContent,
      change(next, name) { next.labels[panel.id] = name; }
    });
  }

  for (const brand of main.querySelectorAll(".project")) {
    const controls = element("div", "brand-editor");
    controls.append(
      button("Rename brand", () => rename(brand)),
      button("Add section", () => open({
        title: "Add section",
        change(next, name) {
          const id = "section-" + crypto.randomUUID();
          next.sections.push({ id, brand: brand.id, name });
          return { brand: brand.id, section: id };
        }
      }))
    );
    brand.querySelector(".project-header").after(controls);
  }

  function editArtwork(galleryId, poster) {
    const picture = poster?.querySelector("img");
    open({
      title: poster ? "Edit or replace image" : "Add images",
      name: poster?.querySelector(".poster-title").textContent,
      alt: picture?.alt,
      image: true,
      brochure: document.getElementById(galleryId)?.classList.contains("brochure-gallery"),
      multiple: !poster,
      poster,
      async change(next, name, blobs) {
        const gallery = next.images[galleryId] ||= {};
        if (poster) {
          const id = artworkId(poster);
          const data = { ...gallery[id], caption: name, alt: altInput.value.trim() };
          if (fileInput.files[0]) {
            const prepared = await files.prepareImage(fileInput.files[0]);
            data.files = prepared.paths;
            for (const entry of prepared.blobs) blobs.set(...entry);
          }
          gallery[id] = data;
        } else {
          for (const file of fileInput.files) {
            const id = "artwork-" + crypto.randomUUID();
            const prepared = await files.prepareImage(file);
            const caption = file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
            gallery[id] = { caption, alt: caption, files: prepared.paths };
            for (const entry of prepared.blobs) blobs.set(...entry);
          }
        }
        return { keepScroll: true };
      }
    });
  }

  window.portfolioEditor.renameSection = rename;
  window.portfolioEditor.editArtwork = editArtwork;

  editorBar.querySelector('[data-editor-action="brand"]').addEventListener("click", () => open({
    title: "Add brand",
    change(next, name) {
      const id = "brand-" + crypto.randomUUID();
      next.brands.push({ id, name });
      return { brand: id };
    }
  }));
  editorBar.querySelector('[data-editor-action="site"]').addEventListener("click", () => open({
    title: "Rename portfolio",
    name: document.querySelector(".wordmark").textContent,
    change(next, name) { next.labels.site = name; }
  }));

  form.querySelector(".editor-cancel").addEventListener("click", () => { if (!busy) dialog.close(); });
  dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const name = nameInput.value.trim();
    if (!name && !job.multiple) {
      message.textContent = "Enter a name before saving.";
      return;
    }
    busy = true;
    saveButton.disabled = true;
    form.querySelector(".editor-cancel").disabled = true;
    message.textContent = "Saving your draft…";
    try {
      const next = structuredClone(catalog);
      const blobs = new Map();
      const context = await job.change(next, name, blobs);
      await files.saveDraft({ base, catalog: next }, blobs, revision);
      visit(context?.brand, context?.section, context?.keepScroll);
    } catch (error) {
      message.textContent = "Could not save the draft. " + error.message;
    } finally {
      busy = false;
      saveButton.disabled = false;
      form.querySelector(".editor-cancel").disabled = false;
    }
  });

  const exportButton = editorBar.querySelector('[data-editor-action="download"]');
  exportButton.addEventListener("click", async () => {
    exportButton.disabled = true;
    status.textContent = "Preparing the GitHub update…";
    try {
      const entries = new Map([["artwork-order.js", new Blob([textFor(window.portfolioEditor.galleryState())])]]);
      for (const filename of pendingPaths()) {
        const blob = await files.readImage(filename);
        if (!blob) throw new Error("A draft image is missing from this browser.");
        entries.set(filename, blob);
      }
      files.download(await files.zip(entries), "portfolio-github-update.zip");
      status.textContent = "Extract the ZIP and drop its contents into GitHub upload. Keep the assets folder intact.";
    } catch (error) {
      status.textContent = "Could not export the update. " + error.message;
    } finally {
      exportButton.disabled = false;
    }
  });
})();
