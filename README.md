# React + Vite

## Deployment

This project supports both Netlify and Vercel. The Vercel API routes in `api/`
adapt the existing handlers in `netlify/functions/`; the URL rewrites preserve
the function URLs used by the frontend.

For Vercel, import this project into the target Vercel repository and use the
Vite defaults: build command `npm run build` and output directory `dist`. Set
`EPOS_CAPTCHA` and `EPOS_SALT` in the Vercel project's environment variables
for every environment that needs port-data lookups.

For Netlify, retain the `netlify.toml` settings and set `EPOS_CAPTCHA` and
`EPOS_SALT` in the site's environment variables. For local Netlify development,
set them in an untracked `.env` file; do not commit credentials.

The app currently has no authentication. Anyone who can access a public
deployment may be able to query and view ration-card information.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
