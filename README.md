# Marawan — Visual Design Portfolio

A single-page portfolio with plain HTML, CSS, and JavaScript. Open `index.html` in a browser to preview it locally.

## Add your work

- Edit and reorder artwork inside each project's `.image-grid` in `index.html`. The artwork viewer follows the same order.
- Store each project's artwork under `assets/<project>/`. Use 480px, 900px, and full-size WebPs in the mobile picture source, and 900px and full-size WebPs in the desktop image. Point `data-full` to the full-size WebP used when the viewer opens.
- Perla has separate Properties and Gardens collections. To fill Gardens, replace its empty message with an image grid using the same caption and alt text markup as Properties.

## Arrange artworks

Open the portfolio with `?arrange=1` to swap artworks within a gallery. Drag an artwork onto another, or select two artworks in turn. **Move to Trash** hides the artwork from the draft gallery. **Restore** in the gallery's Trash puts the artwork back in its saved slot. Drafts are stored in your browser.

To publish the arrangement and Trash state, select **Copy changes for GitHub**, then **Open order file**. Replace the contents of `artwork-order.js` with the copied text and commit the change to `main`.

## GitHub Pages

The site publishes from `main` at the repository root. GitHub shows the deployment status in **Actions** and the public URL in **Settings → Pages**. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## droPrompt

The droPrompt MCP tool expanded the initial brief into a one-page site plan covering the sections, monochrome palette, lightweight motion, accessibility, and GitHub Pages compatibility. That brief guided the implementation.
