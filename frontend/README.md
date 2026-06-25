This frontend is a statically exported [Next.js](https://nextjs.org) app for the Jewel Finance ERP UI.

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For local development, set `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000` in `frontend/.env.local`.
If you leave it unset while running on `localhost:3000`, the browser API bridge now falls back to `http://localhost:8000` automatically.

## Static export

The frontend is configured for static export in [next.config.js](/E:/jewel_finanace/frontend/next.config.js:1):

```bash
npm run build
```

This generates the deployable static site in `frontend/out`.

## Render deployment

Deploy this folder to Render as a Static Site with:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `out`
- Environment Variable: `NEXT_PUBLIC_DJANGO_API_URL=https://fianance-management-system-erp.onrender.com`
- Backend follow-up: add the deployed frontend origin to Django's `CSRF_TRUSTED_ORIGINS` so login and other authenticated POST requests succeed from the Render static-site domain.

The repository root also includes [render.yaml](/E:/jewel_finanace/render.yaml:1) with the same settings for Blueprint-based setup.

## Learn More

To learn more about Next.js static export, take a look at:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) - deployment details for `output: "export"`.
