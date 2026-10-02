# Wedding guest experience — product requirements

> Public derivative: private source links and identifying references removed. Requirement IDs and acceptance criteria are retained. See [provenance](provenance.json).

**Version v0.4 · 2026-10-01 · Review draft.** Historical snapshots remain
unchanged. This revision has not passed a new prototype, customer, or production
review.

This product requirements document (PRD) defines the behavior needed to realize the outcomes in the [business requirements](brd.md). It describes the intended product independently of any prototype and does not authorize production implementation.

The [prioritized user stories](user-stories.md) own atomic acceptance tests. The discussion extract (private research; not published), people and jobs (private research; not published), and operator direction (private research; not published) set the evidence and direction boundaries.

## Product intent

One organizing couple should shape a private wedding-weekend experience, assign
people to events, choose which events require an answer, and manage attendance
without understanding storage or permission systems. Each guest should see what
applies to them, know whose answer they may change, and receive confirmation
matching the saved record.

This is the target to test. No prototype or production capability is claimed.

## Object, authority, and state model

### Product objects

- **Wedding:** one private container for events, people, content, styles, and attendance records
- **Person:** one named invitee, distinct even inside a household
- **Household:** organizer grouping that grants no eligibility or reply authority
- **Schedule event:** one dated weekend item with eligibility, time, place, details, and a reply setting
- **Invitation assignment:** the explicit link making one person eligible for one event
- **Attendance question:** one named request covering an explicit set of schedule events
- **Attendance answer:** one person's saved `accepted` or `declined` answer to one attendance question; absence is `unanswered`
- **Archived answer:** a prior answer retained after scope removal but excluded from active queues and totals
- **Travel item:** current planning guidance with an explicit audience and optional location or link
- **Style configuration:** draft or applied presentation, separate from operational records

### Reply configuration

Each schedule event has one response mode: `separate`, `shared`, or `none`.
New events default to `separate`. A shared question names every event it covers;
events may share only when their invitation scopes are compatible. Ceremony and
reception use one “Wedding ceremony and reception” question. One person's
answer applies only to covered events for which that person is eligible.

After invitation assignments or saved answers exist, response-mode changes are
guarded. The product explains the conflict and requires an explicit safe path.
It never silently copies, merges, splits, or deletes answers.

### Authority and saved truth

The organizer may manage the wedding. A guest may read only permitted people,
events, questions, and content. A guest may change an answer only for themself
or through explicit delegation. Household membership never creates authority.

The saved answer is the shared truth. Guest confirmation, organizer detail,
queues, completeness, and event headcounts derive from it. Draft input changes
nothing. For a shared question, one local save or correction changes all
eligible covered-event results together or changes none. Low-level writes must
enforce the same scope and authority as visible controls.

Authority loss removes now-unauthorized input. Failed or uncertain writes keep
prior saved truth authoritative. A current-state check precedes retry after an
uncertain outcome. Unrelated questions and drafts remain unchanged.

### Counts and completeness

Reply queues and completion summaries count unique person/question requests.
Individual event headcounts count each eligible person once using that event's
question. A schedule-only event reports invited audience and “No reply needed”;
it has no unanswered or attendance-zero state.

## Role journeys

### Organizer journey

1. Set up events, reply modes, weekend details, and guest identities.
2. Assign people to events, grant reply authority, and preview the guest view.
3. Make the intended guest view available through a method that remains open.
4. Find unique unanswered person/question requests and per-event headcounts.
5. Correct one answer deliberately and confirm that every covered event total agrees.
6. Draft, preview, apply, and restore styles without affecting records.

### Guest journey

1. Enter through an identity and recovery method that remains open.
2. See eligible schedule events, no-reply labels, relevant information, and people within explicit reply authority.
3. Answer per person and attendance question, review every covered event, and save.
4. Receive confirmation from the saved result, or recover without partial linked results.
5. Return to change a reply and find current weekend changes.

## Functional requirements

| ID | Product behavior | Links |
|---|---|---|
| **FR-01** | The organizer can create and edit event drafts with name, date, local start time and timezone, place or location-to-follow, eligibility, and reply mode. New events default to a separate question. | BR-01, BR-04 |
| **FR-02** | The organizer can manage distinct people, households, assignments, delegation, and attendance-question coverage. Shared questions require compatible invitation scopes. Reconfiguration after assignments or answers is guarded. | BR-01, BR-07 |
| **FR-03** | Preview shows one selected guest's eligible schedule, authorized people, questions, and content. Preview is labeled and cannot write at the mutation boundary. | BR-01, BR-03 |
| **FR-04** | Guest entry resolves to one permitted guest context or fails without revealing another person's invitation, reply, or private details. The entry and recovery mechanisms remain open. | BR-03, BR-07 |
| **FR-05** | The guest view exposes eligible schedule events and authorized attendance questions. Each question names covered events. Schedule-only events show “No reply needed” and accept no reply write. | BR-01, BR-03, BR-07 |
| **FR-06** | A guest can choose `accepted` or `declined` for one authorized person/question request, leave other questions unanswered, review covered events, and submit only intended changes. | BR-03, BR-07 |
| **FR-07** | Save, confirmation, cancel, failure, uncertainty, retry, and current-state check operate on one person/question request. Shared covered-event results change all-or-none; unrelated drafts remain unchanged. | BR-02, BR-06 |
| **FR-08** | Organizer queues distinguish individual answer states and aggregate completeness while counting each active person/question request once. | BR-02, BR-07 |
| **FR-09** | Each event total derives from current person/question answers. The organizer can drill into the people behind it. Schedule-only events show audience, not attendance. | BR-02, BR-06 |
| **FR-10** | Organizer correction names the person, attendance question, covered events, prior answer, proposed answer, and exact save scope. Shared totals update together or not at all. | BR-02, BR-06, BR-07 |
| **FR-11** | Guests can find current time, place, lodging, travel guidance, and material changes relevant to their view. Missing optional content is omitted or explained without fabricated details. The organizer can author a weekend or travel item with a title, current body, optional location or link, and an audience of all invited guests or one selected event's invitees. A deliberate material-change marker shows the current value and changed timestamp or label only to that audience and can be cleared after review without sending a message. Lodging is guest-managed external guidance and never implies a reservation or invitation. | BR-04 |
| **FR-12** | The organizer can select supported style choices, preview an unsaved draft, apply it deliberately, and restore the preceding applied version. Rejected or uncertain apply and restore operations are locally demonstrable, preserve the complete applied style and all operational records, and retain the intended configuration for retry. Production persistence and atomic delivery remain unverified. | BR-05 |
| **FR-13** | Empty, loading, failure, stale, and unauthorized states explain the current truth and the next safe action. No empty total is presented as zero until replies have been loaded; no save is presented as complete before confirmation. | BR-02, BR-03, BR-06 |
| **FR-14** | Core organizer and guest tasks remain operable at supported mobile and desktop widths, with keyboard access, visible focus, programmatic names, readable status messages, non-color-only meaning, and focus placement after errors or view changes. | BR-08 |
| **FR-15** | Every organizer authoring surface stages local changes and provides save and cancel. Failed or uncertain saves name each affected event, content item, assignment, delegation, reply, or style operation; preserve prior saved truth and retained input; and require retry or current-state reconciliation before another write. | BR-01, BR-02, BR-04, BR-05, BR-06, BR-07 |

## Failure, empty, and recovery behavior

- A wedding with no events gives the organizer a setup path and gives no guest a fabricated schedule.
- A person with no assignments is identified to the organizer and receives no implied invitation.
- A schedule-only event cannot become unanswered, inflate a queue, or accept a crafted attendance write.
- An incompatible shared-question scope is rejected before save.
- Guarded response reconfiguration preserves assignments and saved answers until the organizer completes an explicit safe path.
- A shared local save never leaves covered events with different answers for the same person.
- Loaded nonempty person/question requests with no answers are **all unanswered**. That state is distinct from no active requests, mixed completion, and full completion. Unloaded or failed data must not be shown as a known zero.
- A denied guest entry reveals no matching names, assignments, or event details.
- A lost connection or rejected save keeps prior saved truth authoritative, names the exact affected records, and distinguishes retained input from saved input.
- A stale organizer view requires refresh or reconciliation before a correction can silently replace newer data.
- Missing optional weekend or travel content does not block event readiness or RSVP and is never replaced with fabricated detail.
- Recovery returns the person to a known current state; it never infers identity or authority from household membership.

## Quality requirements

Privacy means least-necessary disclosure: a guest cannot reach another person's data through navigation, direct addressing, search, or response actions. Production acceptance requires authorization tests across weddings and identities; a hidden control is insufficient.

Accessibility is observed through keyboard completion, meaningful names, visible focus, status announcements, associated errors, non-color-only distinctions, and contrast checks. This makes no legal-compliance claim. A release standard remains open.

Responsiveness requires complete core tasks at supported narrow and wide viewports without clipping, sideways scrolling, unreachable controls, or changed meaning. For this prototype review, sample 390 × 844 and 1440 × 1000 CSS-pixel viewports. These are evaluation samples, not a production support matrix. Supported production devices and browsers remain open.

Data integrity requires agreement among saved person/question answers, guest
confirmation, organizer detail, unique queues, and each eligible covered-event
total. Production evidence must cover restart persistence, concurrency,
failures, and isolation; appearance cannot establish them.

## Evidence boundary for prototype testing

| A prototype can provide evidence about | Production-only or external evidence still required |
|---|---|
| Information hierarchy, labels, navigation, preview clarity, visible invitation and question scope, guarded configuration, local atomic simulation, empty states, responsive behavior, keyboard flow, and recovery messages | Real authentication and recovery, authorization enforcement, cross-wedding isolation, durable persistence, concurrency handling, delivery, operational monitoring, security review, and accessibility conformance |

Prototype testing may mark a behavior observed, absent, ambiguous, or not testable. Local simulation controls must preserve current edits and records when switching failure or uncertainty modes; only an explicit scenario or reset action may reload fixtures. This is test-harness behavior, not production persistence proof. Customer value and usability still require representative organizer and guest research.

## Decisions left open

The product does not yet choose authentication, hosting, schema, API, durable
storage, concurrency, publishing, delegation implementation, correction
history, notifications, pricing, or accessibility release coverage. D-12 and
D-13 remain open. Reminders, meal choices, plus-ones, exports, co-organizers,
custom fonts, and free-canvas editing remain deferred decisions.
