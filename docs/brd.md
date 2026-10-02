# Wedding guest experience — business requirements

> Public derivative: private source links and identifying references removed. Requirement IDs and acceptance criteria are retained. See [provenance](provenance.json).

**Version v0.4 · 2026-10-01 · Review draft.** Historical snapshots remain
unchanged. This revision has not passed a new prototype, customer, or production
review.

This business requirements document (BRD) defines the problem and first-version outcomes. It does not authorize a build. The intended product lets one couple manage a private wedding-weekend experience without designing a database or reconciling replies by hand.

An attendance answer belongs to one person and one attendance question. The
question names every schedule event it covers. This replaces the earlier rule
that every event always had its own answer.

Related documents: [product requirements](prd.md) and [prioritized user stories](user-stories.md).

## The problem and intended outcome

One organizer reported becoming overwhelmed while trying to combine password-protected guest access, different invitations across a wedding weekend, lodging information, and RSVP management. That report describes one person's difficulty. It does not establish market size, willingness to pay, a delivery date, or a gap in every existing product.

The intended product lets the organizer define a coherent weekend, decide who
may attend each event, choose which events need an answer, and explain each event
headcount. Guests receive a personal schedule and only the attendance questions
they have authority to answer. The first version is not a migration of the original organizer's
site.

## Stakeholders and evidence limits

- **Organizer:** the couple member who manages events, invitations, guest information, travel guidance, presentation, and replies
- **Guest:** an invited person who views eligible events and replies; guest needs remain hypotheses
- **Product owner:** Nino, who sets direction and decides whether evidence justifies a build
- **Future implementers and testers:** people who must preserve the intended behavior

The evidence is one person's reported difficulty, the proposed people and jobs (private research; not published), and confirmed operator direction (private research; not published). The original report is in the discussion extract (private research; not published). No customer interview, comparative usability study, launch, or prototype verdict supports this baseline.

## Confirmed direction and proposed rules

Confirmed direction:

- Define a general product, not a rebuild of the original organizer's site
- Limit the first version to one couple managing its own wedding
- Let an organizer apply a curated visual style with a few personal choices
- Define the experience and information structure before implementation
- Test a prototype only after this baseline is frozen

Proposed rules needed to make the first version safe and coherent:

- Schedule events, invitation assignments, and attendance questions remain
  separate concepts
- Each event uses a separate question, a compatible shared question, or no reply;
  new events default to a separate question
- Ceremony and reception share one “Wedding ceremony and reception” question
- One person's answer governs only their eligible events covered by that question
- A household grouping grants neither eligibility nor reply authority
- Preview is read-only at visible controls and at the mutation boundary
- Shared local saves and corrections are all-or-none across covered events;
  unrelated questions and drafts remain unchanged
- Failed or uncertain writes preserve prior saved truth; authority loss removes
  newly unauthorized input without deleting legitimately saved answers
- Queues and completeness count unique person/question requests; event
  headcounts count each eligible person once
- Schedule-only events show invited scope and “No reply needed”; they create no
  unanswered work and accept no reply write
- Response reconfiguration after assignments or answers exist is guarded rather
  than silently copying, merging, splitting, or deleting answers
- Lodging is practical external guidance and never an invitation or reservation
  claim

## Business requirements

| ID | Required outcome | Rationale and source | Observable acceptance | Evidence needed |
|---|---|---|---|---|
| **BR-01** | The organizer can define schedule events, event-specific invitation assignments, and each event's reply setting. | Different invitations are reported; the coherent-weekend contract defines the review model. | The organizer can explain each event's eligible people and whether it uses a separate, shared, or no-reply question. | Task observation with representative scopes; reconfiguration checks. |
| **BR-02** | The organizer can manage attendance without reconciling duplicate schedule rows by hand. | RSVP management is the explicit reported difficulty. | The organizer can find one person's answer by question, correct it deliberately, and explain each covered event total from people. | Task observation; consistency checks across questions, people, and event totals. |
| **BR-03** | Each guest receives private access to a clear, limited view of the wedding. | Password protection and different invitations were reported; the permission model remains open. | A guest sees eligible schedule events, explicit covered events for each question, and only the people they may answer for. | Prototype observation; production authentication and isolation evidence. |
| **BR-04** | Guests can find relevant weekend and travel information. | Lodging is reported; guest JOB-2 proposes the broader planning need. | A guest finds current time, place, lodging, and changes intended for all invited guests or that guest's assigned event. The guest can distinguish guidance from an invitation or reservation responsibility. | Guest task research; representative content and audience review. |
| **BR-05** | The organizer can give the experience a personal identity within curated choices. | Operator direction (private research; not published) confirms curated styles with a few personal choices; organizer JOB-3 defines the styling work. | The organizer previews a draft, applies it, restores the prior style, and recovers from a rejected or uncertain operation without changing invitations or replies. | Design selection, usability observation, local failure checks, and production data-regression evidence. |
| **BR-06** | Guests and organizers can correct mistakes without partial linked results or false confirmation. | Correction and recovery are proposed safety needs. | A person/question answer changes atomically across its eligible covered events; failure or uncertainty leaves prior truth visible. | Failure tests; production persistence and concurrency evidence. |
| **BR-07** | Person identity, event eligibility, question scope, and reply authority remain unambiguous. | Household and delegation behavior remain hypotheses that need safe boundaries. | Every answer identifies the person, question, covered events, saved state, and actor allowed to change it. | Permission tests; production authorization evidence. |
| **BR-08** | Core tasks remain usable across common screen sizes and assistive operation. | This proposed quality constraint is not observed demand or a legal-compliance claim. | Core tasks work by keyboard, retain visible focus and labels, communicate errors without color alone, and remain complete at supported widths. | Accessibility-tree, keyboard, contrast, and rendered-screen checks. |

## First-version boundaries

The first version covers one wedding, one organizer role, invited guests,
schedule events, invitation assignments, attendance questions, explicit
delegation, current and archived answers, audience-scoped content, curated
styles, correction, and recovery.

It does not yet require reminders, meal choices, plus-one creation, exports, co-organizer permissions, custom fonts, or free-canvas page editing. Those remain explicit product decisions. It also makes no choice about authentication technology, hosting, storage design, APIs, price, revenue model, cost, or delivery date.

## Business success measures

Targets require baseline research. A future validation plan should measure:

- Whether organizers configure questions, preview scope, find unique unanswered
  requests, correct a shared answer, and reconcile event headcounts
- Whether guests identify eligible schedule events, schedule-only events, and
  every event covered by a saved answer
- Whether failures and denials leave people with an accurate understanding of current state
- Whether guests find relevant travel and change information
- Whether style changes leave invitations and replies intact
- Where people hesitate, abandon, need help, or form the wrong explanation

## Assumptions and open decisions

This review draft assumes a wedding may contain several events, household
members may have different invitations, and one question may safely cover
compatible events. These assumptions need research.

Open decisions include identity and recovery, production delegation, correction
history, separate couple authority, publishing and delivery, retention and
concurrency, accessibility release coverage, and customer acceptance. D-12 and
D-13 remain unresolved.

## Alternatives and falsifiers

A narrower organizer-only tool, a companion to an existing website provider, or an existing product may solve the reported problem with less risk than a new guest-facing product. These alternatives remain open.

The direction should change if organizers cannot maintain trustworthy assignments,
guests do not understand attendance-question scope, a simpler tool solves the
core jobs, or couples need shared organizer authority in version one. Prototype
performance alone does not settle these alternatives.
