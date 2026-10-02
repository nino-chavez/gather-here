# Set up your own wedding application

This is a setup and implementation checklist, not an installer. The current repo runs a fictional static prototype. Complete the application build and its checks before inviting real guests.

## 1. Choose the owner and collect the accounts

You can own the deployment yourself and let an agent or developer perform the technical work. Keep access to the accounts even if someone else builds it. Use existing accounts where appropriate; never borrow another application’s database or keys.

| Item | What to have ready | What the agent records, without secrets |
|---|---|---|
| GitHub | Your fork or new copy of this repo; authority to connect the chosen repo | Repository URL and deployment branch |
| Cloudflare | An account for the app; permission to create a Worker and connect GitHub | Account ID, Worker name and generated URL |
| Supabase | An organization with capacity for a dedicated project | Project reference, region and chosen plan |
| Email delivery | A Resend account and a domain/subdomain you control for the sender | Verified sender address and domain-verification status |
| Secret manager | Your own 1Password vault or equivalent managed secret store | Item references and field names, never values |
| Domain, optional | An owned domain if you want one instead of the generated app URL | Intended hostname and who can change DNS |
| Operating owner | Someone responsible for account recovery, backups, incidents and bills | Name/role in a private handoff, not a public guest-data file |

Before any paid resource, record the current provider plan, usage limits, expected ongoing charges, and your approved limit. This packet does not promise that the MVP can run free. It does not select a paid plan or authorize a domain purchase.

## 2. Run what exists today

Follow the README to install the locked dependencies, build, and serve `dist/`. No Cloudflare, Supabase, or email account is needed for a local prototype. Keep all inputs fictional. The hosted review site and its browser storage are not a place to collect wedding responses.

## 3. Build locally before connecting a live wedding

Have the agent create the SvelteKit application using the official Cloudflare adapter and a compatible pinned toolchain. Keep this walkthrough and selected prototype available as reference while separating application routes from public presentation files.

Proposed application structure; none of these runtime paths exists yet:

```text
src/hooks.server.ts           verified identity, cookies, private caching
src/lib/server/               authorized reads and transactional commands
src/routes/login/             sign-in and recovery
src/routes/(guest)/            personal weekend, questions, replies, travel
src/routes/(organizer)/manage/ people, events, replies, content, style
supabase/migrations/           schema, grants, row policies, functions
supabase/seed.sql              fictional wedding only
tests/                        database permissions and end-to-end journeys
```

Use local Supabase with Docker and captured test mail. Pin project tool versions rather than upgrading someone’s global tools. Build the [RSVP contract](rsvp-contract.md) first. The initial slice uses seeded setup; organizer authoring, uploads and preview are later slices with their own review.

### First durable-slice bootstrap

This is an assignment for the implementing agent after a local build is authorized. It is not part of the working prototype’s installation.

- **Tools:** use Node 24 as the intended application baseline, npm, Git, a running Docker-compatible container engine, and a project-pinned Supabase CLI. CLI 2.102.0 was inspected for `init` and `start` on October 2; this is not a tested application compatibility claim. Pick and record the compatible SvelteKit, adapter, Wrangler, and CLI versions during scaffold verification.
- **SvelteKit:** follow [the official project creation guide](https://svelte.dev/docs/kit/creating-a-project) using `npx sv create` in a temporary scaffold directory. Integrate the generated app into a feature branch without overwriting the walkthrough, prototype, or requirements. Select TypeScript, replace the automatic adapter with the official Cloudflare adapter, and add request-scoped Supabase SSR clients. Commit the actual package versions and lockfile.
- **Local services:** follow [the Supabase CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started). With the pinned CLI installed as a development dependency, run `npx supabase init` in the receiving application root, then `npx supabase start`. Do not force-overwrite existing configuration. Give this project a unique local ID and available ports so it does not collide with another application.
- **Test mail:** retain the CLI’s local email-capture service (`[inbucket]` in the inspected configuration). Open the capture UI at the URL reported by the local CLI. Use synthetic test addresses; do not connect Resend for local tests. The CLI also emits local keys: keep those in ignored configuration and out of chat, screenshots, logs, and commits.
- **Required committed output before P1–P8:** `svelte.config.*`, the compatible Vite and Wrangler configuration, application routes and hooks, `supabase/config.toml`, reviewed migrations, fictional seed, generated database types, an environment-variable-name template without secrets, and reproducible permission/concurrency/journey tests. These files are absent today.
- **Bootstrap acceptance:** from a fresh checkout, install the lockfile, start local services, apply migrations and fictional seed, build the Worker-compatible app, sign in through captured mail, save and reopen one RSVP, and run the direct API denial tests. Record the exact toolchain and results. Only then describe that combination as supported.

## 4. Prepare a separate fictional rehearsal environment

After the owner approves the target accounts and budget, create a dedicated Cloudflare Worker and Supabase project. Choose the database region deliberately. Do not connect branch previews or automated tests to real-wedding data. If a private hosted rehearsal is wanted, Cloudflare Access can restrict reviewer entry; this is optional rehearsal protection, not a replacement for app sign-in or database policies.

Apply only reviewed migrations that have passed on a fresh local database. Seed fictional people. Provision the organizer and authorized test responders explicitly. Disable public signup and bind each verified account to its own role and people. Do not use a shared wedding password as organizer authority.

### Proposed configuration

The template in [deployment-target.example.json](deployment-target.example.json) is an inventory, not a consumed config file. Copy it to an ignored local file and fill in non-secret IDs after provisioning. These values do not configure the current static site.

| Proposed field | Source and destination | Exposure |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Matching Supabase project → app build/runtime | Public project endpoint |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same project → app build/runtime | Browser-safe key only with correct grants and row policies |
| `PUBLIC_APP_URL` | Exact deployment origin → app and redirect validation | Public URL |
| Migration access | Secret manager → deliberate operator migration session | Secret; never browser or ordinary build logs |
| SMTP password | Secret manager → Supabase Auth SMTP settings | Secret; the ordinary app does not need a Resend API key for Auth email |
| Build access | Cloudflare GitHub integration scoped to the chosen repo | Platform-managed; no committed token |
| Privileged Supabase key, if provisioning requires one | Secret manager → separate admin tooling | Never the normal RSVP app, client bundle, seed file, or preview |

Set the Auth site URL and precise redirect allowlist for each environment. Configure the sender in Supabase Auth and prove that an authorized reviewer receives the intended sign-in message. Do not assume a successful API call means email arrived.

Email-code entry is a proposed implementation assumption, not accepted replacement for an existing wedding’s login. Before real use, confirm responder email access, recovery, explicit reply delegation, and separate organizer identities with the owner.

## 5. Connect deployment to GitHub

Connect the future Worker through Workers Builds. Use one tested build command for the app’s checks and build. Keep migrations separate from ordinary frontend deployment. Verify that a clean clone builds without sibling repositories, machine-specific paths, or private research files.

For the current static walkthrough only, Cloudflare Pages publishes `dist/` after the build on `main`. That deployment does not configure the future Worker. The [deployment record](../DEPLOY.md) describes the actual presentation host.

After a push, inspect the provider’s deployment status and open the deployed site. Record the commit, Worker version, database project, and migration version together. A successful Git push is not proof that deployment succeeded.

## 6. Prove the complete RSVP path

Use two separate browser sessions: one organizer and one guest. Save a shared ceremony/reception answer. Close and reopen the guest session. Confirm the saved answer and every affected organizer total agree. Correct it as organizer and verify the guest’s current state.

Run the contract’s permission, concurrency, uncertain-response, cancellation, scope-change, and snapshot checks against the actual database. Test missing, forged and revoked access directly through the Data API. Observe keyboard and phone journeys. Record unrun checks honestly; the inherited browser-model test cannot pass these gates.

## 7. Add the remaining agreed features

Build people/event authoring, invitation and delegation controls, scoped travel content, and style management after their implementation designs are reviewed. If image uploads are needed, create a private bucket, validate files, and test cross-guest and cross-wedding denial. Do not make it public to fix a failed preview.

The event-edit decisions D-12/D-13 remain open: how to handle an invited event that loses required details, and how to review the guests affected by later edits. Resolve those before enabling the relevant writes. Visible correction history and outbound notifications also need a product decision.

## 8. Decide whether to use it for a real wedding

A real wedding is a separate launch decision. Review guest data, the final entry method, mail delivery, permissions, accessibility, backup and image restore, and the owner’s support plan. Use separate resources from the fictional rehearsal or prove an explicit clean separation. Only then import approved records and make the site available to guests.

Read [Operations](OPERATIONS.md) before real use. Keep the existing wedding site available until a deliberate migration and cutover have been accepted.
