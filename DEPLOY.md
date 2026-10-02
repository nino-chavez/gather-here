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

## Verified presentation release

October 2, 2026: Cloudflare Pages deployment `8b2c567e-4b77-4b43-ba5c-088d87b68009` reported `deploy: success` for commit `e721c0dcd12b4fae218496b57add73467c5830d0`. The public alias and `/setup` rendered in the in-app browser. All 12 Playwright checks passed against the hosted alias, including desktop/mobile presentation, navigation, clipboard handoff, and fictional RSVP journeys.

The copied browser tests were adjusted to allow the explicitly selected test host, accept Cloudflare’s canonical clean URLs, and distinguish visible notices from their screen-reader announcements. No product behavior was changed for those test adjustments.

The clean exported checkout passed dependency install, state checks, and static build without private sibling repositories. Gitleaks found no credentials in the curated publication snapshot. This evidence covers the static presentation and fictional browser behavior only. It does not establish an implemented MVP, customer acceptance, authentication, durable storage, mail delivery, or restore readiness.
