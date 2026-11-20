(() => {
  const editMode = new URLSearchParams(window.location.search).get("arrange") === "1";
  const published = window.portfolioOrder || {};
  const template = document.getElementById("arrangement-controls");
  const galleries = [...document.querySelectorAll(".image-grid")].map(grid => ({
    grid,
    id: grid.closest('[role="tabpanel"]').id
  }));

  function posterId(poster) {
    const url = new URL(poster.querySelector("img").dataset.full, document.baseURI);
    return url.pathname.split("/").at(-1).replace(/\.webp$/, "");
  }

  function getOrder(grid) {
    return [...grid.children].map(posterId);
  }

  function applyOrder(grid, order) {
    if (!Array.isArray(order)) return;
    const posters = new Map([...grid.children].map(poster => [posterId(poster), poster]));
    const ordered = [];
    for (const id of order) {
      if (posters.has(id)) {
        ordered.push(posters.get(id));
        posters.delete(id);
      }
    }
    grid.append(...ordered, ...posters.values());
  }

  function copyText() {
    const order = Object.fromEntries(galleries.map(({ id, grid }) => [id, getOrder(grid)]));
    return "window.portfolioOrder = " + JSON.stringify(order, null, 2) + ";\n";
  }

  function enableReordering({ grid, id }) {
    const toolbar = template.content.firstElementChild.cloneNode(true);
    const status = toolbar.querySelector(".arrangement-status");
    const output = toolbar.querySelector(".arrangement-copy");
    const storageKey = "marawan-portfolio-order:" + id;
    const baseOrder = JSON.stringify(getOrder(grid));
    let dragged;
    let target;
    let picked;

    try {
      const draft = JSON.parse(localStorage.getItem(storageKey));
      if (draft?.base === baseOrder) applyOrder(grid, draft.order);
    } catch {
      // Reordering still works for the current session without storage.
    }

    grid.before(toolbar);
    for (const poster of grid.children) {
      poster.draggable = true;
      poster.querySelector("img").draggable = false;
      poster.setAttribute("aria-pressed", "false");
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
      const marker = document.createComment("");
      first.replaceWith(marker);
      second.replaceWith(first);
      marker.replaceWith(second);
      const position = [...grid.children].indexOf(first) + 1;
      const title = first.querySelector(".poster-title").textContent;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ base: baseOrder, order: getOrder(grid) }));
        status.textContent = title + " moved to position " + position + ". Draft saved in this browser.";
      } catch {
        status.textContent = title + " moved to position " + position + " for this session.";
      }
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
      swap(dragged, poster);
      clearDrag();
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
      const order = copyText();
      try {
        await navigator.clipboard.writeText(order);
        status.textContent = "Order copied. Paste it into the order file and commit it on GitHub.";
      } catch {
        output.value = order;
        output.hidden = false;
        output.select();
        status.textContent = "Copy the selected text, then paste it into the order file on GitHub.";
      }
    });
  }

  for (const gallery of galleries) {
    applyOrder(gallery.grid, published[gallery.id]);
    if (editMode) enableReordering(gallery);
  }
})();
