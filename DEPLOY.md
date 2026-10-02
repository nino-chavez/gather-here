# Deployment

## Current presentation

This repository’s `site/` and `prototype/concepts/` directories build into `dist/`. The output contains the walkthrough, setup guide, fictional prototype, and local assets. It does not copy research, credentials, review evidence, or agent configuration into the hosted site.

Configured October 2, 2026: Cloudflare Pages connected to `nino-chavez/gather-here`, branch `main`. Build command: `npm test && npm run build`. Output: `dist`. Site URL: https://gather-here.pages.dev. The Pages project is `gather-here`; Node 24 is configured for builds. Production deployments on push are enabled; branch preview deployments are disabled. No deployment secrets are stored in this repo. The first deployment is triggered by publishing this record.

The presentation is public. `noindex` and `robots.txt` request that search engines not index it; they do not provide access control. All prototype data must remain fictional.

## Future wedding application

The real MVP is a separate SvelteKit application on Cloudflare Workers with a dedicated Supabase project. See [Stack](docs/STACK.md) and [Setup](docs/SETUP.md). No real-wedding Worker, database, mail sender, or guest account is configured by deploying this presentation.

Use Workers Builds for the future application’s automatic deployment from GitHub. Apply reviewed database migrations deliberately and separately; ordinary frontend pushes must not silently migrate real wedding data.

## Recovery

For the presentation, restore a known-good Pages deployment or publish a corrective commit. For the future app, verify database compatibility before reverting code. Database restore and guest-data deletion require an operating-owner decision and a rehearsed recovery procedure.
