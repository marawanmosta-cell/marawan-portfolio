(() => {
  const editMode = new URLSearchParams(window.location.search).get("arrange") === "1";
  const published = window.portfolioOrder || {};
  const template = document.getElementById("arrangement-controls");

  function posterId(poster) {
    const url = new URL(poster.querySelector("img").dataset.full, document.baseURI);
    return url.pathname.split("/").at(-1).replace(/\.webp$/, "");
  }

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
    const empty = document.createElement("p");
    empty.className = "empty-gallery";
    empty.textContent = editMode ? "All artworks are in Trash." : "Artwork coming soon.";
    grid.after(empty);
    return {
      id: panel.id,
      grid,
      items,
      state: normalize(items, published[panel.id]),
      count: panel.querySelector(".project-meta"),
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

  function copyText() {
    const configuration = Object.fromEntries(galleries.map(({ id, state }) => [id, state]));
    return "window.portfolioOrder = " + JSON.stringify(configuration, null, 2) + ";\n";
  }

  function enableEditing(gallery) {
    const { grid, id, items } = gallery;
    const toolbar = template.content.firstElementChild.cloneNode(true);
    const status = toolbar.querySelector(".arrangement-status");
    const output = toolbar.querySelector(".arrangement-copy");
    const trashCount = toolbar.querySelector(".trash-count");
    const trashList = toolbar.querySelector(".trash-list");
    const trashEmpty = toolbar.querySelector(".trash-empty");
    const trashSummary = toolbar.querySelector(".gallery-trash summary");
    const storageKey = "marawan-portfolio-order:" + id;
    const base = JSON.stringify(gallery.state);
    const legacyBase = gallery.state.trashed.length === 0 ? JSON.stringify(gallery.state.order) : null;
    let dragged;
    let target;
    let picked;

    try {
      const draft = JSON.parse(localStorage.getItem(storageKey));
      if (draft && (draft.base === base || draft.base === legacyBase)) {
        gallery.state = normalize(items, draft.state || draft.order);
      }
    } catch {
      // Editing still works for the current session without storage.
    }

    const state = gallery.state;
    const titleOf = poster => poster.querySelector(".poster-title").textContent;
    const cards = new Map();
    for (const [artworkId, poster] of items) {
      poster.draggable = true;
      poster.querySelector("img").draggable = false;
      poster.setAttribute("aria-pressed", "false");

      const card = document.createElement("div");
      card.className = "arrangement-card";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "trash-artwork";
      remove.textContent = "Move to Trash";
      remove.setAttribute("aria-label", "Move " + titleOf(poster) + " to Trash");
      remove.addEventListener("click", () => trashArtwork(artworkId));
      card.append(poster, remove);
      cards.set(artworkId, card);
    }

    function renderTrash() {
      const rows = state.trashed.map(artworkId => {
        const title = titleOf(items.get(artworkId));
        const row = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = title;
        const restore = document.createElement("button");
        restore.type = "button";
        restore.textContent = "Restore";
        restore.setAttribute("aria-label", "Restore " + title);
        restore.addEventListener("click", () => {
          state.trashed = state.trashed.filter(id => id !== artworkId);
          refresh();
          const position = [...grid.children].indexOf(cards.get(artworkId)) + 1;
          save(title + " restored to position " + position + ".");
          (trashList.querySelector("button") || trashSummary).focus({ preventScroll: true });
        });
        row.append(label, restore);
        return row;
      });
      trashCount.textContent = "(" + rows.length + ")";
      trashList.replaceChildren(...rows);
      trashList.hidden = rows.length === 0;
      trashEmpty.hidden = rows.length !== 0;
    }

    function refresh() {
      renderGrid(gallery, cards);
      renderTrash();
    }

    function save(message) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ base, state }));
        status.textContent = message + " Draft saved in this browser.";
      } catch {
        status.textContent = message + " Changes are available for this session.";
      }
    }

    function trashArtwork(artworkId) {
      const position = [...grid.children].indexOf(cards.get(artworkId));
      setPicked();
      state.trashed.push(artworkId);
      refresh();
      save(titleOf(items.get(artworkId)) + " moved to Trash.");
      const neighbor = grid.children[Math.min(position, grid.children.length - 1)];
      (neighbor?.querySelector(".trash-artwork") || trashSummary).focus({ preventScroll: true });
    }

    function setPicked(poster) {
      picked?.setAttribute("aria-pressed", "false");
      picked = poster;
      picked?.setAttribute("aria-pressed", "true");
    }

    function setTarget(poster) {
      target?.classList.remove("is-drop-target");
      target = poster;
      target?.classList.add("is-drop-target");
    }

    function clearDrag() {
      dragged?.classList.remove("is-dragged");
      dragged = undefined;
      setTarget();
    }

    function swap(first, second) {
      const a = state.order.indexOf(posterId(first));
      const b = state.order.indexOf(posterId(second));
      [state.order[a], state.order[b]] = [state.order[b], state.order[a]];
      renderGrid(gallery, cards);
      const position = [...grid.children].indexOf(cards.get(posterId(first))) + 1;
      save(titleOf(first) + " moved to position " + position + ".");
    }

    grid.addEventListener("dragstart", event => {
      dragged = event.target.closest(".poster");
      if (!dragged) return;
      setPicked();
      dragged.classList.add("is-dragged");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", posterId(dragged));
    });
    grid.addEventListener("dragover", event => {
      const poster = event.target.closest(".poster");
      if (!dragged || !poster || poster === dragged) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (poster !== target) setTarget(poster);
    });
    grid.addEventListener("dragleave", event => {
      if (!target?.contains(event.relatedTarget)) setTarget();
    });
    grid.addEventListener("drop", event => {
      const poster = event.target.closest(".poster");
      if (!dragged || !poster || poster === dragged) return;
      event.preventDefault();
      const source = dragged;
      clearDrag();
      swap(source, poster);
    });
    grid.addEventListener("dragend", clearDrag);

    grid.addEventListener("click", event => {
      const poster = event.target.closest(".poster");
      if (!poster) return;
      if (!picked || picked === poster) {
        setPicked(picked ? undefined : poster);
        status.textContent = picked ? "Select the artwork to swap with." : "Selection cleared.";
        return;
      }
      swap(picked, poster);
      setPicked();
      poster.focus({ preventScroll: true });
    });
    grid.addEventListener("keydown", event => {
      if (event.key === "Escape" && picked) {
        setPicked();
        status.textContent = "Selection cleared.";
      }
    });

    toolbar.querySelector(".copy-order").addEventListener("click", async () => {
      const config = copyText();
      try {
        await navigator.clipboard.writeText(config);
        status.textContent = "Changes copied. Paste into the order file and commit on GitHub.";
      } catch {
        output.value = config;
        output.hidden = false;
        output.select();
        status.textContent = "Copy the selected text, then paste it into the order file on GitHub.";
      }
    });

    grid.before(toolbar);
    refresh();
  }

  for (const gallery of galleries) {
    if (editMode) enableEditing(gallery);
    else renderGrid(gallery);
  }
})();
