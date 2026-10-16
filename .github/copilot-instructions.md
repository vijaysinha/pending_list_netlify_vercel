# Copilot Instructions

## Build, lint, and tests

- `npm run dev` starts the Vite frontend.
- `npm run build` creates the production bundle in `dist/`.
- `npm run lint` runs ESLint across the project. To lint one file, run `npm exec eslint -- src/components/Frame.jsx` (replace the path as needed).
- There is no test script or automated test suite configured in `package.json`.
- To exercise Netlify Functions locally, use `netlify dev` with the Netlify CLI and provide the required environment variables.

## Architecture and data flow

- `src/main.jsx` mounts the React app; `src/App.jsx` delegates the page to `src/components/Frame.jsx`. `Frame` handles shop searches and renders desktop/mobile pending-distribution results.
- `src/getDistribution.js` and `src/getAllotment.js` call the corresponding Netlify Functions and normalize EPOS responses by ration-card ID. `src/getFinalData.js` combines those results and calculates each commodity's remaining quantity. Keep its commodity keys consistent with the table columns in `Frame.jsx`.
- RC-specific port transactions are fetched through `src/usePortData.js` from `/.netlify/functions/getPortData`; `PortComponent.jsx` reports the rice pickup status. Port data adjusts rice quantities, while other commodity balances come from the shop-level allotment/distribution calculation.
- `netlify/functions/` contains the server-side EPOS API handlers. The browser calls these functions rather than calling EPOS directly. Shared EPOS date logic lives in `shared/eposPeriod.js`; use it for EPOS month/year and date calculations because it applies the `Asia/Kolkata` business timezone.

## Repository-specific conventions

- Keep EPOS response parsing and normalization in the data helpers or Netlify handlers, not in presentation components. The functions return JSON response bodies and report failures with non-2xx status codes.
- EPOS credentials are supplied through `EPOS_CAPTCHA` and `EPOS_SALT`. Configure them in Netlify's environment settings or an untracked local `.env`; never commit credentials.
- The app currently has no authentication and can expose ration-card information to visitors of a public deployment. Treat changes to its access or data exposure deliberately.
