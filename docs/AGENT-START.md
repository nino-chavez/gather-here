# Start here with an agent

Help the owner run **one wedding in accounts they control**. This repository is currently a presentation and a browser-only prototype. The SvelteKit application, database migrations, production authentication, mail delivery, and backup/restore procedures still need implementation and verification.

Giving an agent this repository is enough to explain the plan and begin implementation planning. It is not enough to launch a working RSVP service by setting a few keys.

## Copy this prompt

> Read this repository’s AGENTS.md and docs/AGENT-START.md. Explain the current prototype and the proposed single-wedding application in plain language. Use docs/STACK.md, docs/SETUP.md, and docs/OPERATIONS.md to walk me through the accounts, services, configuration, and remaining implementation work. Inspect the actual code before claiming anything is implemented. Start with one wedding in my own accounts. Do not add a multi-wedding signup service, billing, or platform administration. First show what already runs, what needs building, and the few decisions you need from me. Do not ask me to paste secrets into chat. Obtain specific approval before creating billable resources, changing DNS, importing real people, sending email, or launching a live wedding. Once I authorize a bounded implementation, complete and verify it without repeatedly asking to continue.

## Read in this order

1. [README](../README.md): run the current static walkthrough and fictional prototype.
2. [Stack](STACK.md): which product responsibilities belong to which services.
3. [Setup](SETUP.md): account ownership, environment inventory, configuration, and build order.
4. [RSVP contract](rsvp-contract.md): the first durable implementation slice. This overrides broader proposals for reply saves, reconciliation, and consistent reads.
5. [Product requirements](prd.md) and [user stories](user-stories.md): intended behavior and acceptance criteria. [Business requirements](brd.md) explain why.
6. [Design](../DESIGN.md) and `prototype/concepts/`: selected experience and visual reference.
7. [Operations](OPERATIONS.md): checks needed before real guests and responsibilities after launch.

## Establish the current state

Inspect `package.json`, the file tree, and the latest commit. Today, `npm run build` produces static files in `dist/`; `npm test` checks the simulated reply model. Neither command provisions services or proves durable storage. There is no `src/` SvelteKit app, `supabase/migrations/`, or configured production sign-in yet.

The public walkthrough is hosted separately from the future private wedding application. Its Cloudflare Pages deployment belongs to the project maintainer. Do not repurpose that public deployment or its demo controls for real guests.

The [public baseline](public-baseline.json) identifies the contract and requirements used by this receiving project. The original private research and review receipts are not required to run the public prototype. They are not dependencies an agent should search for on the owner’s machine. The public requirements retain their IDs; private source links are intentionally omitted.

## Ask only the choices that matter

Establish who owns the GitHub, Cloudflare, Supabase, and email-sender accounts; whether this is a fictional rehearsal or a real-wedding build; and the approved spend. A custom domain can wait. Confirm whether each responder can receive an email code, and who may answer for another person. Names alone do not establish access rights.

Use the single-wedding option unless the owner explicitly chooses a product for many couples. The latter adds onboarding, billing, tenant administration, per-couple domain and sender decisions, abuse handling, and support. None belongs in the current build merely because the data model has a wedding ID.

## First implementation assignment

Build one complete, fictional RSVP path: managed sign-in, seeded permission records, guest read/save, organizer read/correction, and recovery after a lost response. Keep browser and direct database API authorization consistent. Follow the transaction contract and run its P1–P8 checks against a real local database. Do not port every prototype panel before the first path works.

Use current official SvelteKit, Cloudflare, and Supabase patterns. Pin compatible packages and commit the lockfile. Verify from a clean checkout. The source initiative’s historical version recommendations are not a substitute for a current compatibility test.

Update this packet with actual setup steps only after they work. Record deployment commit, database migration version, environment, owner, and verification results without secrets. Use `NOT_RUN` for anything not exercised. A screenshot, a green build, a delivered login email, and a real saved answer prove different things.
