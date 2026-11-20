(() => {
  let database;

  function openDatabase() {
    database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open("marawan-portfolio-editor", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("drafts");
        request.result.createObjectStore("images");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database;
  }

  async function read(store, key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveDraft(draft, images, revision) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["drafts", "images"], "readwrite");
      let saveError;
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(saveError || transaction.error || new Error("Unable to save the draft."));
      const drafts = transaction.objectStore("drafts");
      const current = drafts.get("portfolio");
      current.onsuccess = () => {
        if ((current.result?.revision || 0) !== revision) {
          saveError = new Error("This draft changed in another tab. Refresh the editor and try again.");
          transaction.abort();
          return;
        }
        drafts.put({ ...draft, revision: revision + 1 }, "portfolio");
        for (const [filename, blob] of images) transaction.objectStore("images").put(blob, filename);
      };
    });
  }

  function webp(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob?.type === "image/webp") resolve(blob);
        else reject(new Error("This browser could not encode the image. Try Chrome or Edge."));
      }, "image/webp", quality);
    });
  }

  async function prepareImage(file) {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error("Choose a JPG, PNG, or WebP image.");
    const image = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const asset = "assets/portfolio-uploads/" + crypto.randomUUID();
    const blobs = new Map();
    const fullScale = Math.min(1, 2560 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * fullScale));
    const height = Math.max(1, Math.round(image.height * fullScale));
    const paths = {};
    try {
      for (const [key, maxWidth, quality] of [["full", width, .96], ["wide", 900, .91], ["small", 480, .88]]) {
        const scale = Math.min(1, maxWidth / width);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        paths[key] = asset + "-" + key + ".webp";
        blobs.set(paths[key], await webp(canvas, quality));
      }
    } finally {
      image.close();
    }
    return { paths: { ...paths, width, height }, blobs };
  }

  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
  }

  // Media is already compressed. A stored ZIP keeps the export dependency-free.
  async function zip(entries) {
    const local = [];
    const central = [];
    const encoder = new TextEncoder();
    let offset = 0;
    let directorySize = 0;

    for (const [filename, blob] of entries) {
      const name = encoder.encode(filename);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const checksum = crc32(bytes);
      const header = new DataView(new ArrayBuffer(30));
      header.setUint32(0, 0x04034b50, true);
      header.setUint16(4, 20, true);
      header.setUint16(12, 0x21, true);
      header.setUint32(14, checksum, true);
      header.setUint32(18, bytes.length, true);
      header.setUint32(22, bytes.length, true);
      header.setUint16(26, name.length, true);
      local.push(header.buffer, name, blob);

      const record = new DataView(new ArrayBuffer(46));
      record.setUint32(0, 0x02014b50, true);
      record.setUint16(4, 20, true);
      new Uint8Array(record.buffer, 6, 26).set(new Uint8Array(header.buffer, 4, 26));
      record.setUint32(42, offset, true);
      central.push(record.buffer, name);
      offset += header.byteLength + name.length + bytes.length;
      directorySize += record.byteLength + name.length;
    }

    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.size, true);
    end.setUint16(10, entries.size, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);
    return new Blob([...local, ...central, end.buffer], { type: "application/zip" });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.portfolioFiles = {
    readDraft: () => read("drafts", "portfolio"),
    readImage: filename => read("images", filename),
    saveDraft,
    prepareImage,
    zip,
    download
  };
})();
