# Run one wedding with the usual stack

Use **SvelteKit + Cloudflare Workers + Supabase**, with **Resend connected to Supabase Auth** for sign-in emails. This follows the existing fleet’s application and deployment pattern. The simplest target is a dedicated application and database for one wedding, owned by the person running it.

**Current state:** the public walkthrough is static and hosted on Cloudflare Pages. The services below describe the future RSVP application. Connecting these accounts will not turn the browser prototype into that application; code and migrations still need to be built.

## Feature to service map

| What the couple or guest needs | Application responsibility | Service | Needed when |
|---|---|---|---|
| Open the guest site or organizer workspace | SvelteKit pages, forms, request handlers, accessible UI | Cloudflare Worker with the official SvelteKit adapter and static assets | First durable slice |
| Sign in privately | Managed email-code entry, verified identity, session cookies, recovery | Supabase Auth | First durable slice; code entry is a proposed demo choice pending guest-fit review |
| Receive a sign-in code | Auth email template, permitted redirect origin, verified sender | Resend SMTP configured in Supabase Auth | Hosted sign-in; local development uses email capture |
| Know who is invited and who can reply | Explicit assignments, organizer membership, responder grants; authorization on every request | Supabase Postgres, explicit grants and row-level security | First durable slice, with seeded fictional setup |
| Save a reply and see it as organizer | Atomic answer, audit, operation receipt, version checks and recovery | Postgres transaction through the [RSVP contract](rsvp-contract.md) | First durable slice |
| Edit events, people, travel details and guest styling | Purpose-built organizer forms and validated configuration | SvelteKit + Postgres | Later MVP slices after their design review |
| Add a personal cover image | Type/size checks, owner permission, authorized delivery | Private Supabase Storage bucket | When image upload is built; solid covers work without it |
| Publish code changes | Versioned code, tested build, automatic deployment from the chosen branch | GitHub + Cloudflare Workers Builds | Before shipping the MVP |
| Use a personal site address | Domain control, DNS and app/Auth origin configuration | Existing registrar/DNS provider + Cloudflare | Optional until the owner chooses a domain |
| Keep the wedding recoverable | Backups of records and image objects, restore drill, operator handoff | Supabase facilities plus an owner-controlled backup destination | Before real guest data |

No separate CMS, custom authentication server, Redis, queue, payment provider, or general site builder is required for the first RSVP slice. Resend is for authentication email here; reminders and invitation campaigns are separate product work.

## How a reply moves

```text
Guest or organizer
  → SvelteKit on Cloudflare Workers
      → Supabase Auth verifies the signed-in identity
      → Postgres checks current permission and saves one transaction
          answer + audit + operation receipt
      ← authorized saved state and versions
  ← clear confirmation, conflict, or recovery action

Supabase Auth → Resend SMTP → responder’s mailbox
GitHub main → Workers Builds → tested application deployment
```

An uncertain network response must not become a second unreviewed write. The app checks the operation’s result before issuing a new intent. Ceremony and reception can share one answer; their headcounts derive from that answer rather than duplicate response rows.

## One wedding is the default

| Decision | One wedding in your accounts | Service for many couples |
|---|---|---|
| Resource ownership | Your GitHub repo, Cloudflare account, Supabase project, sender and domain | Service operator owns and supports shared resources |
| Setup | One configured wedding, provisioned organizer, explicit invited responders | Couple signup, workspace creation, role management and onboarding |
| Database | One wedding in the deployed project; keep scope checks and wedding IDs | Tenant isolation becomes an ongoing platform responsibility |
| Payments | None for product access | Pricing, subscriptions and billing would need their own design |
| Guest-facing branding | One wedding’s content, chosen style and optional domain | Per-wedding configuration, domain onboarding and lifecycle controls |
| Operations | One owner maintains accounts, backups and the post-wedding shutdown plan | Support, abuse controls, quotas, customer exits and tenant operations |

Do not remove permission checks because there is only one wedding. Guests within the same wedding can have different invitations and reply rights. Use a second synthetic wedding in security tests to catch scope failures without building a multi-wedding UI.

## Sources and local precedents

Checked October 2, 2026. These links describe vendor patterns, not verification of a Gather Here backend:

- [SvelteKit Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare): deploy the app using the official adapter; validate its current output and compatibility requirements when scaffolding.
- [Cloudflare Workers Builds with GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/): use platform deployment on push. Do not add a competing manual-only deploy process.
- [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client): request-scoped server clients and cookie handling. Follow the SvelteKit variant.
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp): default mail is restricted; configure and prove delivery to an authorized mailbox before a hosted sign-in demo.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control): permissions remain necessary beyond the application UI.

Internal precedents inspected: Rally HQ’s `src/hooks.server.ts` (request-scoped verified identity) and the photography app’s `src/lib/supabase/server-ssr.ts` (ordinary SSR client separate from privileged admin client). They informed this design but are not external dependencies. A recipient without those repositories should use the public vendor guides and the explicit contract here.

Use the stable managed Postgres default and no unnecessary extensions. Check the [Supabase changelog](https://supabase.com/changelog) again at implementation time. No package compatibility matrix or cost estimate has been verified for the unbuilt MVP.
