# Home Dashboard

A fast, installable PWA for triggering Alexa routines through Virtual Buttons.

## First run

```bash
npm install
cp src/config.example.js src/config.js
npm run dev
```

Edit `src/config.js` and replace the placeholder access code with your Virtual Buttons access code.

## Tests

```bash
npm test
npm run coverage
npm run check
```

## Build

```bash
npm run build
```

The deployable site is generated in `dist/`.

## GitHub Pages

Set GitHub Pages to deploy from a GitHub Actions workflow or upload the contents of `dist/` to the publishing branch. Because the Vite base is `./`, the app works from a project Pages URL.

## Fully Kiosk

Point Fully Kiosk at the deployed HTTPS URL. Enable fullscreen mode and keep the screen awake while charging.

## Security note

`src/config.js` is ignored by Git, but any access code used in a browser app is visible to that browser. Treat the dashboard URL and device as private. Virtual Buttons currently requires the access code in the request URL.
