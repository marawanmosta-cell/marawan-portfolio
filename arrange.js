window.portfolioCatalogReady.then(() => {
  const published = window.portfolioOrder || {};
  const editor = window.portfolioEditor;
  const posterId = editor.artworkId;

  function normalize(items, value) {
    const order = Array.isArray(value) ? value : value?.order;
    const trash = value?.trashed;
    const listed = Array.isArray(order) ? order : [];
    return {
      order: [...new Set([...listed.filter(id => items.has(id)), ...items.keys()])],
      trashed: [...new Set(Array.isArray(trash) ? trash.filter(id => items.has(id)) : [])]
    };
  }

  const galleries = [...document.querySelectorAll(".image-grid")].map(grid => {
    const panel = grid.closest('[role="tabpanel"]');
    const items = new Map([...grid.children].map(poster => [posterId(poster), poster]));
    const id = grid.dataset.galleryId || panel.id;
    const empty = document.createElement("p");
    empty.className = "empty-gallery";
    empty.textContent = "Artwork coming soon.";
    grid.after(empty);
    return {
      id,
      grid,
      items,
      state: normalize(items, published[id]),
      count: grid.parentElement === panel ? panel.querySelector(":scope > .project-header .project-meta") : null,
      empty
    };
  });

  function renderGrid(gallery, cards = gallery.items) {
    const { grid, state, count, empty } = gallery;
    const visible = state.order.filter(id => !state.trashed.includes(id));
    const nodes = visible.map(id => cards.get(id));
    if (grid.children.length !== nodes.length || nodes.some((node, i) => grid.children[i] !== node)) {
      grid.replaceChildren(...nodes);
    }
    empty.hidden = visible.length !== 0;
    if (count) count.textContent = visible.length + (visible.length === 1 ? " artwork" : " artworks");
  }

  for (const gallery of galleries) {
    renderGrid(gallery);
  }
});
