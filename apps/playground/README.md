# Reusable Workflows playground

Private React/Vite application used to render the repository documentation and real workflow examples on GitHub Pages.

The app intentionally reads its content from the repository-level `docs/` and `examples/` directories rather than maintaining a second copy inside the app.

## Development

From the repository root:

```sh
npm install
npm run dev
```

Build the Pages site with:

```sh
npm run build:playground
```
