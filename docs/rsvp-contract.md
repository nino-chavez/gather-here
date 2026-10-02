> Public design derivative, exported October 2, 2026. This preserves the proposed RSVP transaction contract; private evidence links are omitted. Earlier review claims refer to the originating initiative, not a new verification here. P1–P8 remain NOT_RUN for a durable Gather Here app. Follow [Agent start](AGENT-START.md) and [Setup](SETUP.md) for the receiving project.

---
canonical: false
candidate: wedding-durable-rsvp-01
revision: 2
status: design-candidate-see-review-record
date: 2026-10-02
---

# Save one reply and recover without guessing

**For the wedding implementing engineer and technical reviewer.** This candidate designs the first durable RSVP slice against the frozen v0.4 requirements. It is a Blueprint research pilot, awaiting application by the wedding owning chat. It authorizes no application build, cloud change, real guest import, email or release. The user authorized the bounded design pilot on October 2.

The engineering target remains SvelteKit, Supabase and Cloudflare from ADR 0002 (original source record; not included in this public export). This contract fills in the save boundary beneath the existing handoff (original source record; not included in this public export). It does not replace the handoff or reopen visual direction.

## Bound the first slice before judging readiness

Implement later against fictional, seeded weddings: verified responder sign-in, authorized guest read, one person/question reply, recovery, organizer totals/detail and organizer correction. Seed compatible shared/separate questions and a schedule-only event. Include two weddings and distinct responders to test isolation. Auth users, memberships, delegation and invitation setup are supplied by an operator-owned local seed, not public signup.

Excluded from this slice: organizer setup/editing, invitation/delegation editing UI, event reconfiguration, preview, travel/style edits, uploads, notification delivery and hosted operations. Their existing contracts remain required before those features ship. The local seed and test-only revocation/assignment operations still obey the transaction protocol below. This exclusion cannot be used to omit negative permission or revocation tests.

| Required behavior, derived from source | Design owner here | Planned check |
|---|---|---|
| BR-03/07; FR-04/05; AC-02.5, 04.3/04.4, 05.4/05.6: identity alone grants no other person's access | Authorization table | P1 |
| BR-06/07; FR-06/07; AC-07.1–07.7, 08.1–08.4: one reviewed pair, atomic shared result, recovery and conflicting saves | Save and recovery protocol | P2–P5 |
| BR-02; FR-08/09; AC-10.1–10.5: unique requests, explainable totals and consistent detail | Read snapshot | P6 |
| BR-06; FR-10; AC-11.1–11.6: authorized correction changes only the reviewed pair | Same command with correction purpose | P1–P6 |
| FR-02; AC-02.7–02.9: removal preserves history, re-add does not revive an old answer, revocation preserves valid replies | Request lifecycle and serialized scope changes | P7 |
| BR-08: usable error/recovery interaction | Existing experience states and later rendered acceptance | P8 |

Trace to the existing experience inventory: W-04 and W-05; V-08/09/10/11 and V-16/17/18/19/20; I-15, I-17–24, I-27–33 and I-45; S-01/02/03 and S-14–20. These are source IDs, not newly created screens. Guest inline review is V-19; correction inline review is V-11. Page IDs do not prescribe routes. Source hashes (original source record; not included in this public export) identify the exact requirements reviewed; the originating initiative had no Git revision at review time.

## Keep one mutation boundary

```text
Guest review / organizer correction
  SvelteKit action: verify identity, origin and input
    save_rsvp(command), called with the user's JWT
      private transaction: current authority + scope + versions
        one request answer + audit + command receipt
  read snapshot: current replies + derived totals + one revision
```

Three candidate structures were compared against shared questions, direct API attacks and a lost response:

| Structure | Consequence | Decision |
|---|---|---|
| Several server-side table calls | A later call can fail after an earlier answer or audit write commits | Reject: does not meet atomicity. |
| One invoker function with direct user DML grants | The function can be atomic, but a caller can bypass it and omit audit/receipt writes unless more triggers own those invariants | Retain ordinary invoker reads; reject this write shape for the bounded slice. |
| One restricted private writer, reached by a thin invoker RPC | Direct user DML stays denied; one function owns authorization, answer, audit and receipt | Select. Prove privileges and direct-API denial before porting UI. |

The vendor baseline is `SECURITY INVOKER`. The narrow exception is necessary because the atomic audit/receipt protocol must be unavoidable while ordinary callers have no table DML privileges. A private `SECURITY DEFINER` writer uses `search_path = ''`, fully qualified object names, no dynamic SQL and no caller-supplied actor. Own it with a dedicated `NOLOGIN`, `NOBYPASSRLS` role that owns no tables, has no role memberships and receives only the required table privileges and corresponding RLS policies. Never use `postgres`, a service-role client, or broad schema grants as a shortcut for routine saves.

The exposed wrapper is `SECURITY INVOKER`; it forwards arguments without making a second authority decision. Explicitly revoke default function execution from `PUBLIC` and `anon`; grant only the named entry points and required private helper execution to `authenticated`. Keep the private schema outside the API's exposed schemas. Grant `USAGE` only where the wrapper requires it. The writer checks `auth.uid()` and live database permission for every call, including calls made outside SvelteKit. The dedicated writer's RLS policies admit its narrow operations, so they do not independently prove end-user scope: the function's checks are load-bearing and require adversarial integration tests.

Borrow the rejected invoker candidate's ordinary user-token reads. Borrow the multi-call candidate's small application handlers, but put the transaction in Postgres. Do not add a separate backend service or generic command framework.

## Give persistent objects an exact identity

Proposed table/field names below are implementation contracts, not installed SQL. UUIDs identify records; every child relationship includes `wedding_id` in its foreign key. Cross-wedding references fail at the database boundary, even for the writer role.

| Record | Key and minimum fields | Invariant |
|---|---|---|
| `weddings` | `id`, `scope_revision`, `data_revision` | One row is the serialization lock. Counters start at zero and increase inside the owning transaction. |
| `organizer_memberships` | `(wedding_id, auth_user_id)`, `active` | Created/revoked only by operator bootstrap in this slice. No public role promotion. |
| `responders` | `(wedding_id, auth_user_id)`, `active` | Current wedding admission is required even when an old JWT remains valid. |
| `people` | `(wedding_id, id)`, display name, optional household ID | A person is distinct from an Auth account; household grouping grants nothing. |
| `reply_grants` | `(wedding_id, auth_user_id, person_id)`, `active` | Explicit authority, including self. Guest reads and writes require an active responder and grant. |
| `events` | `(wedding_id, id)`, `ready`, reply mode and nullable question ID | `none` has no question; a separate question covers one event. |
| `questions` | `(wedding_id, id)`, `active` | Shared coverage requires identical eligible person sets for its ready covered events. |
| `event_assignments` | `(wedding_id, event_id, person_id)`, `active` | At most one active assignment per pair; coverage uses current active assignments. |
| `rsvp_requests` | `(wedding_id, id)`, `person_id`, `question_id`, `active`, nullable `answer`, `version` | Partial unique key on active `(wedding_id, person_id, question_id)`. Answer is null, `accepted` or `declined`; initial version is zero. |
| `rsvp_commands` | `(wedding_id, actor_id, operation_id)`, request ID, purpose, outcome, timestamp; committed variant adds canonical input hash, resulting answer/version and immutable scope | A committed or cancelled command is immutable. Same key cannot mean a different intent. Retain all for this fictional pilot. Cancelled tombstones have no answer/input hash; they reserve the key/request/purpose. |
| `rsvp_audit` | `(wedding_id, id)`, request/operation/actor IDs, purpose, prior/new answer, prior/new version, immutable scope, timestamp | Append-only and committed with the answer. Authenticated callers cannot write it directly. |

The request row contains the current answer; there is no second mutable answer table. Null means an existing eligible request is unanswered. No active request means no eligible attendance question, not unanswered. Materializing a slot before the first answer gives concurrent first saves a row/version to contend over. History remains in archived request rows and the audit.

Immutable scope contains `person_id`, `question_id`, the sorted `covered_event_ids` and `scope_revision` at save time. Write it into both the committed receipt and audit inside the save transaction. These IDs describe the scope at that moment; do not reconstruct them from today's assignments. Audit/receipt foreign keys use restrictive deletion, never cascading loss of evidence. Retain source entities for this pilot. An unchanged committed command records its scope too, although it creates no answer-change audit.

Seed validation must reject incompatible shared coverage, unready active events, orphan requests, cross-wedding links and duplicate active requests. Later authoring must preserve those invariants transactionally before it is enabled. Routine RSVP saves independently recheck current request eligibility and shared coverage; a malformed seed must fail closed.

On assignment removal, archive the request only when no eligible covered event remains. If removing an assignment makes a shared question incompatible, reject the configuration change instead of preserving an invalid group. Re-add after archival creates a new request ID with null answer/version zero. Never unarchive an old answer. Delegation revocation changes authority, not saved replies. The test-only admin path locks the wedding row, changes scope and request lifecycle together, then increments both revisions. It is unavailable in the runtime bundle.

## Enforce current authority on every surface

| Caller | May read | May change |
|---|---|---|
| Unauthenticated or inactive responder | No private wedding records | Nothing |
| Active responder with an explicit grant | Granted people, their eligible questions/events and own command outcomes while still authorized | One active eligible request for a granted person, with purpose `guest` |
| Active organizer membership | That wedding's organizer read model and operational audit | One eligible request with purpose `organizer-correction` |
| Same household without a grant | No additional person's private information | Nothing additional |
| Valid user from another wedding | Only their own authorized wedding | Nothing in the target wedding |
| Preview frame | Not implemented in this slice; retain the handoff's inert sandbox contract | No mutation surface may be mounted or token supplied there |

RLS on exposed tables enforces the read rules; policies depend on current membership/delegation, not editable metadata or stale role claims. Membership, responder and grant tables allow only the caller's own active rows to guests; organizer-visible guest/person data must not expose other Auth identifiers. Use acyclic policies and explicit column grants. Request history and audits are organizer-only; guests see active requests. Command history is scoped to the actor and current request authority. The dedicated writer can inspect current authority but cannot create users, grant roles or change scope.

All direct `INSERT`, `UPDATE` and `DELETE` privileges are revoked from `anon` and `authenticated` on domain/audit/receipt tables. Public read views, if any, use `security_invoker = true`. Test grants and RLS independently. No service secret belongs in the ordinary app runtime for this slice.

The writer's wedding-row privilege is column-limited to `data_revision`; it cannot update `scope_revision` or membership/delegation. It can update only answer/version on active request rows, insert audit/command rows and read the necessary scope. Scope setup/removal remains an operator-only path. Its function owner receives no table ownership and cannot alter policies or functions.

Use request-scoped SSR clients with verified `getClaims()`/`getUser()` identity, correct refreshed cookies, private `no-store` responses, origin checks and an allowlist for redirects. Use the managed OTP assumption already accepted in ADR 0002; no public signup. Auth revocation must deactivate the responder or organizer membership in the database before relying on session removal. Logs may contain operation IDs and error classes, not answers, tokens, email addresses or guest names.

## Save exactly the reviewed request

Proposed command, shared by guest and correction entry points:

```text
SaveRsvp {
  weddingId, requestId, operationId: UUID
  purpose: guest | organizer-correction
  expectedScopeRevision, expectedRequestVersion: nonnegative integer
  answer: accepted | declined
}
Result: committed | conflict | forbidden | invalid | cancelled
Transport failure: outcome uncertain (not a database verdict)
```

Do not accept `actorId`, a household write scope, event totals, a list of answers or a flag that elevates permission. `purpose` selects a required authorization branch; changing it never grants that authority. Unknown fields and invalid enums fail before writes. Hash the parsed fields in fixed order, including purpose and expected versions, inside the database. Use a canonical built-in representation and digest; the client cannot supply the trusted digest.

One transaction executes these steps in order:

1. Require a verified non-null `auth.uid()`. Check admission enough to avoid locking another wedding on arbitrary input, then lock the target wedding row `FOR UPDATE` and recheck admission, purpose, person authority and active eligibility after obtaining the lock. All scope changes, revocations, saves and recovery use this same lock first.
2. Check the actor/wedding/operation key. First reject a different request/purpose under that key. A cancelled key stays cancelled without a payload-hash comparison. A committed matching command returns its original outcome plus current request state; it does not reapply the answer or increment versions. A mismatched committed-command hash returns `invalid`. Recheck current authority before disclosing a prior result.
3. For a new command, compare both expected versions. Scope change yields `conflict` even if this answer is unchanged. Another answer save yields `conflict` if its request version differs. Return an authorized current snapshot for reconciliation. Do not silently retry a new intent.
4. Validate the selected request and coverage again. Update only this request, increment its version and the wedding's `data_revision`, and append one audit and one committed command row with the immutable save-time scope. Failure in any of these rolls back all of them. Covered event counts are derived, never separately written.
5. Return the result after transaction commit. An unchanged proposed answer at the current versions may return an explicit unchanged result recorded under the key; it changes no answer version, audit or data revision. The envelope still uses `committed` with `changed: false`.

The wedding lock serializes unrelated writes too. That is an intentional small-demo tradeoff. Use bounded lock/statement timeouts in the migration; a timeout is a known rejection only when the server receives the database rollback. If the response is lost, the UI stays uncertain. Revisit lock granularity only after measured contention; do not preemptively add distributed locks.

## Resolve uncertainty before another intent

The browser keeps the pending operation ID and request ID scoped to the signed-in account in session storage until it is resolved; these are recovery identifiers, never authorization. Retained answer input stays in memory and is discarded on logout or authority loss. Refresh can recover an operation by its ID and then show current saved truth without claiming the discarded draft was saved.

`reconcile_rsvp(weddingId, requestId, operationId, purpose)` is an authenticated POST, not a supposedly read-only GET. It uses the same wedding lock and authority checks. If a committed receipt exists, return its outcome and current state. If the key is absent, insert a terminal `cancelled` tombstone for that actor/key/request/purpose, then read current state. A delayed original save sees that tombstone and cannot commit. Existing keys with different request/purpose are invalid. A second reconciliation is idempotent.

An absence-only GET is insufficient: the original request could begin after that read. The tombstone closes that race. Following cancellation or conflict, the user reviews current truth and retained authorized input before creating a new operation ID with fresh expected versions. While uncertain, the affected pair cannot issue a new intent. Unrelated drafts remain drafts. A rejected or uncertain save never replaces the displayed confirmed truth.

Do not delete receipts/tombstones during the private pilot; deleting one could permit an old request to apply. Real-use retention, expiry semantics and abandoned-client recovery require an operating decision before real guests. If reconciliation itself times out, remain uncertain and retry reconciliation with the same key. Authority loss clears inaccessible input and reveals no current private state. Guest and organizer use the same protocol.

## Read totals and detail from the same snapshot

`read_rsvp_snapshot(weddingId)` is a read-only, `STABLE` invoker RPC using one SQL statement, with row policies applied under the user's JWT. It returns `scopeRevision`, `dataRevision`, and each active request's `id`, `version`, `answer` and covered events, plus the applicable totals/detail from one database snapshot. Every committed/conflict/reconcile result includes the same version fields for the authorized current state. A new intent takes its expected scope/request versions from that exact snapshot, never from an earlier cache or by incrementing them locally. A guest receives only their permitted subset, never organizer-wide totals. Organizer views derive unique pending work by request ID; each event counts each eligible person once through that event's question. Schedule-only events expose invited scope and `No reply needed` with no attendance counts.

Do not invoke the read RPC from inside the definer and assume its RLS still runs as the original caller. The privileged save/reconcile body returns an explicitly scoped current view of the affected request only, filtered against `auth.uid()` and the checked purpose. The response separates `commandResult` (the historical result of this operation) from `currentRequest` (which may now have a newer answer), with current scope/request/data versions. Fetch the full read snapshot separately under the original user's JWT after the command. Its revision can be newer; replace totals/detail together and never combine it with an older command result. Forbidden results reveal no snapshot.

Do not issue a separate totals query and attach a revision fetched later. Selecting detail from an existing snapshot uses that snapshot; refreshing replaces totals and detail together. If a subsequent read has a different revision, mark the earlier view as needing refresh. Direct read tables are not proof that a composite view is consistent. At the database's default read-committed isolation, separate statements may see separate snapshots; verify the RPC remains one statement or deliberately raises transaction isolation.

## Prove the implementation later against these cases

All checks below are **NOT_RUN**. No SQL, app or test harness is created by this contract. These are acceptance obligations for the eventual implementing engineer, not a claim that the design works.

| ID | Real boundary to exercise | Failure the check must demonstrate it can detect |
|---|---|---|
| P1 | Local Supabase with two synthetic weddings; guest, delegated guest, organizer, revoked user and no-token caller. Attack direct table APIs and both RPCs, including forged purpose, IDs and actor fields. | Deliberately grant a forbidden write or break a scope predicate in a disposable test database; the negative test must fail, then restore. |
| P2 | Fresh database migrations/seed; save one shared answer, restart clients, read guest and organizer truth | Force audit/receipt insertion failure inside the transaction; answer and all summaries must remain prior truth. |
| P3 | Real concurrent transactions save different answers from the same initial request version, including unanswered version zero | Exactly one succeeds; the other must reconcile. A test without a synchronized overlap does not prove the race. |
| P4 | Drop a committed save's response; reconcile and retry original key/payload | No second answer write/audit/version bump. Reuse key for another payload must fail. |
| P5 | Delay original save before lock acquisition; reconcile absent key; release delayed save. Reverse the order too. | Cancellation wins before save or committed receipt wins before recovery; never a late unaccounted write. Test repeated recovery timeout. |
| P6 | Shared/separate/schedule-only mix; concurrent correction during organizer reads | One person per covered event, one pending shared request, no zero-on-load failure, one totals/detail revision. Break snapshot composition once to prove detection. |
| P7 | Scope removal/re-add and permission revocation while save waits; use a test-only admin transaction following the same wedding lock | Revocation/removal wins and save is rejected, or save commits before change; legitimate history survives. Re-added slot is unanswered with a new ID. |
| P8 | Port W-04/W-05 to Chromium and WebKit with real backend, then keyboard and cold rendered review | Correct pair and covered events named; input/cancel/recovery affect only that pair; no false success. Not replaced by database tests. |

Choose concrete timeouts and test synchronization when authoring migrations. Changing transaction ordering, privileges, key semantics, source requirements or included scope requires a new candidate review. Formatting or unrelated content changes do not.

## Keep unresolved product choices outside the verdict

| Decision | Owner and current treatment | Held work |
|---|---|---|
| D-03, real guest identity/entry fit | Nino/product owner; ADR 0002 supplies a fictional-demo OTP assumption only | Real guest adoption or site replacement |
| D-07, visible correction history and notifications | Product owner; internal audit is already in handoff, no new guest-facing history/notification is implied | History UI and notifications |
| D-08, concurrent saves | Engineering proposal here: versions, serialization and explicit recovery; independent review required | Durable save coding until reviewed candidate is adopted |
| D-12/13, incomplete invited events and affected-guest review | Product owner; unchanged open decisions | Event editing/reconfiguration |
| Production receipt/data retention, backups and restore | Operating owner; handoff remains source | Real guests and hosted-ready claim |

The readiness verdict covers this bounded design only. It cannot close any NOT_RUN check, accept the product for the stakeholder, change the completed research-stage cursor, authorize a build, or promote a shared Blueprint gate.

## Source and review boundary

The receiving project uses [public-baseline.json](public-baseline.json) to identify this public contract and its public BRD, PRD, and stories. Review and implementation in Gather Here must verify those public hashes and record any subsequent changes. The original private manifest is historical provenance only; it is not a dependency or a gate for the recipient. Matching a hash establishes source identity, not design acceptance or working behavior.

The original review recorded vendor fetches on October 2. Its private fetch receipts are historical provenance and are not required here. Consult the public primary sources below again before implementation. Use explicit grants and verify actual Data API exposure; this proposal needs no optional database extension. No compatibility test or durable runtime acceptance is claimed by this export.

- [Supabase database functions](https://supabase.com/docs/guides/database/functions): invoker default, explicit execution grants and fixed search path for a justified private definer.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): scoped policies and caution about exposed privileged functions.
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client): request-scoped verified identity and refreshed cookies.
- [PostgREST transaction isolation](https://docs.postgrest.org/en/stable/references/transactions.html): transaction and snapshot behavior.
- Internal sources: Rally hook (original source record; not included in this public export) for request-scoped identity; Rally invitation transaction (original source record; not included in this public export) for locks/conditional writes. Its service-role bearer-token design is deliberately not copied. Photography SSR/admin split (original source record; not included in this public export) shows privileged clients kept separate; the ordinary RSVP app needs none.

Review must independently derive the consequential requirements from the BRD/PRD/stories, test this design against them and identify omissions. The review record must hash this file, name reviewer independence and unresolved findings, and keep design judgment separate from unrun behavior checks.
