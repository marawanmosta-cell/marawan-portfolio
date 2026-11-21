# Marawan — Visual Design Portfolio

A single-page portfolio with plain HTML, CSS, and JavaScript. Open `index.html` in a browser to preview it locally.

## Edit the portfolio

Choose **Edit portfolio** in the header, or open the portfolio with `?arrange=1`. **Preview draft** shows the saved draft as a gallery in your browser. **View live** opens the published gallery.

- **Add brand** creates a project. **Add section** creates a gallery inside the active project. You can rename projects, sections, and the portfolio title in the editor.
- **Add images** accepts multiple JPG, PNG, or WebP files. **Edit / Replace** updates the artwork's caption, image description, or image in its current slot.
- **Edit Behance project** lets you update the summary, project link, and cover thumbnail for a linked project.
- Drag one artwork onto another to swap them. **Move to Trash** removes an artwork from the draft gallery. **Restore** puts the artwork back in its saved slot.

The editor stores drafts and uploaded images in the browser. To publish, choose **Publish changes**, then **Download GitHub update**. Extract the ZIP and choose **Open GitHub upload**. Drag the extracted `artwork-order.js` and, if present, the entire `assets` folder onto the upload page. Commit the files to `main` together.

For changes without new image files, **Copy changes for GitHub** can update just `artwork-order.js`.

## GitHub Pages

The site publishes from `main` at the repository root. GitHub shows the deployment status in **Actions** and the public URL in **Settings → Pages**. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## droPrompt

The droPrompt MCP tool expanded the initial brief into a one-page site plan covering the sections, monochrome palette, lightweight motion, accessibility, and GitHub Pages compatibility. That brief guided the implementation.
