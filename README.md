# Restructured Project

This project was automatically reorganized from the uploaded zip (`zipzapzap.zip`) for easier development.

## Structure created
- `/` — Project root. Important HTML files are placed here (like `index.html` if found).
- `/assets/css/` — Stylesheets (.css, .scss, .sass)
- `/assets/js/` — JavaScript and TypeScript files
- `/assets/img/` — Images (png, jpg, svg, etc.)
- `/assets/fonts/` — Font files
- `/src/` — Source code (python, php, etc.)
- `/data/` — JSON and other data files
- `/docs/` — Documentation, .md and .txt and PDFs
- `/misc/` — Files that didn't match known types (or unknown extensions)

If any HTML files reference assets using relative paths, you may need to update the paths to point to `/assets/...`. Example change:
```html
<link rel="stylesheet" href="assets/css/style.css">
<script src="assets/js/app.js"></script>
```

## Notes
- Files that had name conflicts were renamed with a short hash suffix. See `CONFLICTS.txt`.
- If you want a different organization (e.g., `src/` for all web code, or `public/`), tell me and I can adjust.