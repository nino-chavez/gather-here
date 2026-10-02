# Wedding guest experience — prioritized user stories

> Public derivative: private source links and identifying references removed. Requirement IDs and acceptance criteria are retained. See [provenance](provenance.json).

**Version v0.4 · 2026-10-01 · Review draft.** Historical snapshots remain
unchanged. Every criterion requires a new evaluation; older passes do not carry
forward to this model.

This backlog turns the [business requirements](brd.md) and [product requirements](prd.md) into atomic tests. It remains a proposed requirements baseline, not a build order or a record of prototype capability.

The evidence boundary comes from the discussion extract (private research; not published), people and jobs (private research; not published), and operator direction (private research; not published). No criterion below has passed customer acceptance.

## Priority and evidence meanings

- **P0 — first-version safety or core value:** required to test the central organizer and guest journeys without creating misleading reply or access behavior
- **P1 — coherent first experience:** important to the intended weekend experience, but the central invitation-and-reply loop can be assessed before it is complete
- **Deferred — explicit later decision:** outside the first-version baseline; inclusion requires evidence and a separate priority decision

Each acceptance criterion states what the product must do. Its tag states what evidence can prove:

- **Prototype:** observable in a local interface without claiming production integrity
- **Production:** requires real authorization, isolation, persistence, concurrency, delivery, or operational evidence
- **Research:** requires representative people rather than interface inspection

A story marked **Mixed** contains more than one evidence category. Prototype success never satisfies its Production criteria.

## P0 stories

### US-01 — Set up the wedding weekend

**Story:** As an organizer, I want to define the wedding, its schedule events,
and each event's reply setting so that invitations and attendance questions
refer to one clear weekend plan.

- **Priority:** P0
- **Trace:** BR-01, BR-04; FR-01, FR-15; organizer JOB-1
- **Dependencies:** none
- **Evidence category:** Prototype-observable

**Acceptance criteria**

- **AC-01.1 [Prototype]** Given a wedding with no events, when the organizer begins setup, then the product explains what an event is and offers one clear way to add it.
- **AC-01.2 [Prototype]** Given valid event details and a reply setting, when the organizer saves an event, then the event appears with its current name, time, place, and separate, shared, or no-reply setting.
- **AC-01.3 [Prototype]** Given a required event field is missing or invalid, when the organizer tries to save, then the product identifies that field and does not present the event as ready.
- **AC-01.4 [Prototype]** Given optional weekend information is empty, when the organizer reviews setup, then the product identifies the omission without inventing content or blocking unrelated setup.
- **AC-01.5 [Prototype]** Given an event has a name, date, local start time with timezone, and either a venue name and location or an explicit location-to-follow value, when readiness is evaluated, then the event is ready even if end time and notes are empty.
- **AC-01.6 [Prototype]** Given any required event value is absent, when the organizer leaves the event as a draft, then it remains visibly incomplete and cannot be assigned as a ready invitation.
- **AC-01.7 [Prototype]** Given the organizer creates a new event, when its initial reply setting appears, then it defaults to a separate attendance question and may be changed deliberately.

### US-02 — Define people, event assignments, attendance questions, and reply authority

**Story:** As an organizer, I want each person assigned to the right events,
attendance questions, and reply authority so that invitations, shared answers,
and delegation remain deliberate.

- **Priority:** P0
- **Trace:** BR-01, BR-07; FR-02, FR-15; organizer JOB-1
- **Dependencies:** US-01
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-02.1 [Prototype]** Given two people in one household, when the organizer assigns them to different events, then each person retains a distinct effective event list.
- **AC-02.2 [Prototype]** Given a selected person, when the organizer reviews assignments, then the product shows every included schedule event, its attendance question or no-reply setting, and the organizer action that included it.
- **AC-02.3 [Prototype]** Given one person may answer for another, when the organizer grants that authority, then the effective scope identifies the delegating action separately from household grouping.
- **AC-02.4 [Prototype]** Given a person has no event assignment, when the organizer reviews the guest list, then the product identifies that condition without implying an invitation.
- **AC-02.5 [Production]** Given one person is assigned to an event and another is not, when each guest context is authorized, then the unassigned person cannot retrieve or change the assigned person's event or reply.
- **AC-02.6 [Prototype]** Given an assignment or delegation edit, when the organizer has not saved it, then the draft is distinguishable from saved scope and can be canceled without changing saved scope.
- **AC-02.7 [Prototype]** Given a person has a saved attendance answer used by an event, when removal of that event assignment is confirmed, then the prior answer remains inspectable, the event leaves active guest scope and totals, and pending input that no longer has eligible scope is discarded.
- **AC-02.8 [Prototype]** Given an archived or retained answer exists, when the person is reassigned to an event and no active compatible answer applies, then the new active person/question request starts unanswered and prior history is not silently restored.
- **AC-02.9 [Prototype]** Given one guest's delegation for another person is revoked, when the revocation is confirmed, then legitimately saved replies remain current while future authority and unauthorized pending changes are removed.
- **AC-02.10 [Prototype]** Given an assignment or delegation save fails, is uncertain, or is stale, when recovery appears, then it names the affected people and events, preserves saved scope and retained input, and offers retry or a current-state check before another write.
- **AC-02.11 [Prototype]** Given the organizer tries to place events with incompatible invitation scopes into one shared attendance question, when the configuration is reviewed or saved, then the product rejects the shared scope, identifies the mismatch, and preserves the prior configuration.
- **AC-02.12 [Prototype]** Given invitation assignments or saved answers already exist, when the organizer tries to change an event between separate, shared, and no-reply modes, then the product guards the change, explains the affected questions and answers, and does not silently rewrite them.

### US-03 — Preview a guest's experience

**Story:** As an organizer, I want to preview one guest's effective view so that I can catch invitation and content mistakes before guests rely on it.

- **Priority:** P0
- **Trace:** BR-01, BR-03; FR-03; organizer JOB-1
- **Dependencies:** US-01, US-02
- **Evidence category:** Prototype-observable

**Acceptance criteria**

- **AC-03.1 [Prototype]** Given a selected guest identity, when the organizer opens preview, then the preview shows that identity's eligible events, authorized people, and relevant content.
- **AC-03.2 [Prototype]** Given preview is open, when the organizer scans the page, then a persistent label distinguishes preview from a real guest session.
- **AC-03.3 [Prototype]** Given the organizer changes an assignment, when preview is refreshed, then the effective view reflects the current assignment rather than an unexplained older state.
- **AC-03.4 [Prototype]** Given the organizer interacts with a reply control in preview, when leaving preview, then no guest reply has been presented as saved.
- **AC-03.5 [Prototype]** Given organizer drafts, replies, totals, or history exist, when preview is entered, used, and exited, then each record remains unchanged.

### US-04 — Enter a private guest context

**Story:** As a guest, I want to enter the invitation meant for me so that I can see my information without exposing anyone else's.

- **Priority:** P0
- **Trace:** BR-03, BR-07; FR-04; guest JOB-1
- **Dependencies:** US-02; identity and recovery mechanism decision before production
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-04.1 [Prototype]** Given entry resolves to one permitted guest context, when the guest arrives, then the page identifies the context clearly enough for the guest to notice a mismatch.
- **AC-04.2 [Prototype]** Given entry cannot be completed, when the guest submits or continues, then the product gives a recovery action without confirming whether another named person exists.
- **AC-04.3 [Production]** Given two guest identities in the same wedding, when one attempts direct access to the other's information, then authorization denies the request and discloses no private invitation or reply details.
- **AC-04.4 [Production]** Given identical names exist in different weddings, when either person enters or recovers access, then the system resolves authority without crossing wedding boundaries.

### US-05 — Understand invitation and reply scope

**Story:** As a guest, I want to see exactly which schedule events, attendance
question, and people my answer covers so that I do not answer beyond my
invitation or authority.

- **Priority:** P0
- **Trace:** BR-01, BR-03, BR-07; FR-05; guest JOB-1
- **Dependencies:** US-02, US-04
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-05.1 [Prototype]** Given a guest has assignments to some schedule events, when the invitation opens, then only eligible events appear and answerable events are linked to their attendance question.
- **AC-05.2 [Prototype]** Given the guest may answer for more than one person, when attendance controls appear, then each control names the person, attendance question, and every covered event.
- **AC-05.3 [Prototype]** Given household membership without explicit delegation, when the guest views response scope, then no control offers authority over the other household member.
- **AC-05.4 [Production]** Given an unauthorized person/question request, when a guest submits a crafted change outside the visible interface, then the change is rejected and the saved answer remains unchanged.
- **AC-05.5 [Prototype]** Given an eligible schedule event has no reply required, when the guest sees it, then it is labeled “No reply needed,” shows no attendance control or unanswered state, and remains part of the schedule.
- **AC-05.6 [Production]** Given a schedule event has no reply required, when any client submits a crafted attendance write for it, then the write is rejected and no attendance answer or count is created.

### US-06 — Answer by person and attendance question

**Story:** As an authorized guest, I want to answer each attendance question for
one person so that one saved answer matches the events it explicitly covers.

- **Priority:** P0
- **Trace:** BR-03, BR-07; FR-06; guest JOB-1
- **Dependencies:** US-05
- **Evidence category:** Prototype-observable

**Acceptance criteria**

- **AC-06.1 [Prototype]** Given an authorized unanswered person/question request, when the guest chooses accepted, then review shows that person, question, every covered event, and the intended accepted state.
- **AC-06.2 [Prototype]** Given several authorized person/question requests, when the guest answers one and leaves another untouched, then review distinguishes the intended answer from the unanswered request without duplicating a shared question by event.
- **AC-06.3 [Prototype]** Given the guest changes a reviewed answer before saving, when review updates, then only the selected person/question draft changes.
- **AC-06.4 [Prototype]** Given no reply change is selected, when the guest reaches the save action, then the product does not imply that an answer will be recorded.

### US-07 — Save and confirm the shared truth

**Story:** As a guest, I want confirmation to match what was actually saved so
that I know the current person/question answer rather than the attempted answer.

- **Priority:** P0
- **Trace:** BR-02, BR-06; FR-07; guest JOB-1
- **Dependencies:** US-06
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-07.1 [Prototype]** Given a save for one reviewed person/question request succeeds, when confirmation appears, then it names the person, question, covered events, and current answer.
- **AC-07.2 [Prototype]** Given a save for one person/question request fails, when the failure appears, then it names that request and covered events, shows prior saved truth, retains authorized input, and does not show success.
- **AC-07.3 [Prototype]** Given a failed save, when the guest retries or reloads, then the interface provides at least one safe path back to a known current person/question state.
- **AC-07.4 [Production]** Given a confirmed reply and a new session after restart, when the authorized guest and organizer view it, then both receive the same durable current result.
- **AC-07.5 [Prototype]** Given a save outcome is uncertain, when the guest checks current state, then the product names the affected person/question request and covered events and does not permit another write until saved truth and retained input are reconciled.
- **AC-07.6 [Prototype]** Given another question has an unsaved draft, when the guest saves the reviewed person/question request, then the other draft remains unsaved and unchanged.
- **AC-07.7 [Prototype]** Given one attendance question covers ceremony and reception, when its local save succeeds, fails, or ends uncertain, then guest result, organizer detail, and both event totals reflect one confirmed answer or the same prior truth; no partial linked result appears.

### US-08 — Return and change a reply

**Story:** As a guest, I want to review and change a prior reply so that the saved record reflects my current plans.

- **Priority:** P0
- **Trace:** BR-06, BR-07; FR-07, FR-13; guest JOB-1
- **Dependencies:** US-07
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-08.1 [Prototype]** Given a saved reply exists, when the guest returns, then the current saved state is distinguished from any new unsaved choice.
- **AC-08.2 [Prototype]** Given the guest changes accepted to declined, when review appears, then the person, attendance question, and covered events are named before save.
- **AC-08.3 [Prototype]** Given the guest abandons an unsaved change, when the current reply is shown again, then the prior saved state remains authoritative.
- **AC-08.4 [Production]** Given two authorized sessions attempt conflicting changes, when both saves are processed, then the product prevents a silent overwrite or identifies the newer current result for reconciliation.

### US-09 — Find replies that need attention

**Story:** As an organizer, I want to find attendance answers by event, person,
question, and state so that I can see who is coming and which unique questions
remain unanswered.

- **Priority:** P0
- **Trace:** BR-02, BR-07; FR-08; organizer JOB-2
- **Dependencies:** US-02, US-07
- **Evidence category:** Prototype-observable

**Acceptance criteria**

- **AC-09.1 [Prototype]** Given person/question requests in all three individual states, when the organizer filters or navigates by state, then unanswered, accepted, and declined people are distinguishable.
- **AC-09.2 [Prototype]** Given one person has answers across several questions, when the organizer opens that person, then each question and its covered events appear without duplicating a shared answer.
- **AC-09.3 [Prototype]** Given a household has answered and unanswered attendance questions, when the organizer views the group, then its summary distinguishes outstanding requests while preserving each person/question state.
- **AC-09.4 [Prototype]** Given no replies match a view, when it loads, then the product explains the empty result and does not imply that no one is attending.
- **AC-09.5 [Prototype]** Given at least one active person/question request and none has an accepted or declined answer, when the organizer views its aggregate state, then it is labeled all unanswered rather than empty, partial, or complete.
- **AC-09.6 [Prototype]** Given one attendance question covers ceremony and reception, when the organizer views queues or household completeness, then that person's request is counted once; schedule-only events add no request.

### US-10 — Reconcile event totals with people

**Story:** As an organizer, I want each event headcount tied to underlying
person/question answers so that I can trust and explain the count without
duplicating shared questions.

- **Priority:** P0
- **Trace:** BR-02, BR-06; FR-09; organizer JOB-2
- **Dependencies:** US-09
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-10.1 [Prototype]** Given known person/question answers, when an answerable event summary appears, then accepted, declined, and unanswered totals match the eligible underlying people.
- **AC-10.2 [Prototype]** Given an organizer selects a total, when detail opens, then the product shows the people and current states included in that total.
- **AC-10.3 [Prototype]** Given replies have not loaded, when the summary is waiting or fails, then it does not present empty data as zero.
- **AC-10.4 [Production]** Given a reply changes concurrently with a summary read, when the organizer reconciles, then the total and detail resolve to one current version or disclose that refresh is required.
- **AC-10.5 [Prototype]** Given ceremony and reception share one question, when one person's answer changes, then that person is counted once in each eligible event total; given a schedule-only event, its summary shows invited scope and “No reply needed,” not attendance zero.

### US-11 — Correct a reply deliberately

**Story:** As an organizer, I want to correct one person's attendance-question
answer inline with clear covered-event scope and recovery so that shared totals
cannot diverge.

- **Priority:** P0
- **Trace:** BR-02, BR-06, BR-07; FR-10, FR-15; organizer JOB-2
- **Dependencies:** US-09, US-10
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-11.1 [Prototype]** Given an answer is selected for correction, when inline review opens, then the person, attendance question, covered events, prior saved answer, proposed answer, and exact save scope are visible without another confirmation screen.
- **AC-11.2 [Prototype]** Given a shared-question correction succeeds, when the organizer returns to detail and event totals, then the person detail and every eligible covered event show the same new current answer.
- **AC-11.3 [Prototype]** Given a correction fails, when the error appears, then the prior saved reply remains visible as current and a safe retry or reload action is offered.
- **AC-11.4 [Production]** Given the organizer is not authorized for the wedding, when a correction is attempted outside the interface, then it is denied without changing the reply.
- **AC-11.5 [Prototype]** Given other answer drafts exist, when the organizer saves the reviewed person/question request, then only that question changes and every other draft remains unsaved.
- **AC-11.6 [Prototype]** Given one person/question request is in inline review, when the organizer cancels it, then only that draft is discarded and its prior saved answer remains current.

## P1 stories

### US-12 — Find travel details and current changes

**Story:** As a guest, I want relevant weekend, lodging, and change information so that I can plan without mistaking guidance for an invitation or reservation.

- **Priority:** P1
- **Trace:** BR-04; FR-11; guest JOB-2
- **Dependencies:** US-01, US-04
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-12.1 [Prototype]** Given relevant travel content exists, when the guest looks for planning information, then time, place, lodging, and other guidance use clear, scannable labels.
- **AC-12.2 [Prototype]** Given general guidance mentions an event or lodging option, when it is displayed, then the product does not present that guidance as a personal invitation or confirmed reservation.
- **AC-12.3 [Prototype]** Given material information has changed, when the guest returns, then the current value and the fact of the change are visible without relying on color alone.
- **AC-12.4 [Research]** Given representative traveling guests, when they complete planning tasks, then research records whether they find the right place and time and understand what still requires their action.

### US-13 — Draft, preview, apply, and restore a style

**Story:** As an organizer, I want curated presentation choices with safe preview and restore so that the wedding feels personal without risking invitation or reply data.

- **Priority:** P1
- **Trace:** BR-05; FR-12, FR-15; organizer JOB-3
- **Dependencies:** a human-selected design direction and supported style choices
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-13.1 [Prototype]** Given an applied style, when the organizer changes a supported choice in draft, then preview shows the draft while the guest-facing applied version remains identifiable.
- **AC-13.2 [Prototype]** Given a draft preview, when the organizer applies it, then the applied presentation changes without changing people, assignments, or replies.
- **AC-13.3 [Prototype]** Given a newly applied style is unsuitable, when the organizer restores the preceding version, then the prior presentation returns.
- **AC-13.4 [Production]** Given apply or restore fails partway, when the operation ends, then guests receive one complete applied version rather than a mixture, and operational records remain unchanged.
- **AC-13.5 [Prototype]** Given style apply or restore is rejected, when the failure appears, then the prior complete applied style and all guest and RSVP records remain unchanged while the intended configuration remains available for retry.
- **AC-13.6 [Prototype]** Given style apply or restore ends uncertain, when the organizer checks current state, then the interface identifies one complete applied style and retains the intended configuration without claiming success.

### US-14 — Complete core tasks accessibly across screen sizes

**Story:** As an organizer or guest, I want the core experience to work with keyboard and assistive operation on narrow and wide screens so that presentation does not block the task.

- **Priority:** P1
- **Trace:** BR-08; FR-14; organizer JOB-1 and JOB-2, guest JOB-1 and JOB-2
- **Dependencies:** US-03, US-06, US-09, US-12, US-13
- **Evidence category:** Mixed

**Acceptance criteria**

- **AC-14.1 [Prototype]** Given keyboard-only operation, when a person completes preview, reply, correction, and travel-finding tasks, then every control is reachable in a meaningful order with visible focus.
- **AC-14.2 [Prototype]** Given assistive technology reads a core form or status, when labels, errors, and save results are encountered, then they have programmatic names and useful announcements tied to the affected control or result.
- **AC-14.3 [Prototype]** Given supported narrow and wide viewports, when core journeys are completed, then content and actions remain available without clipped text, sideways page scrolling, or changed meaning.
- **AC-14.4 [Prototype]** Given status, selection, error, or change meaning is shown, when color is unavailable, then text, shape, or another perceivable cue carries the same meaning.
- **AC-14.5 [Production]** Given the release candidate and selected accessibility standard, when conformance testing runs, then results, exceptions, and assistive-technology coverage are recorded without claiming broader legal compliance.

### US-15 — Author weekend and travel content for the right guests

**Story:** As an organizer, I want to keep current weekend and travel information for its intended guests so that people receive useful guidance without mistaking it for an invitation or reservation.

- **Priority:** P1
- **Trace:** BR-04; FR-11, FR-15; organizer JOB-4
- **Dependencies:** US-01, US-02
- **Evidence category:** Prototype-observable

**Acceptance criteria**

- **AC-15.1 [Prototype]** Given a content draft, when the organizer saves it, then the saved item has a title and current body and may include a location or link.
- **AC-15.2 [Prototype]** Given a saved content item, when its audience is selected, then the organizer chooses either all invited guests or one event's current invitees.
- **AC-15.3 [Prototype]** Given an event-scoped content item, when a guest outside that event's assignment views planning content, then that item is unavailable.
- **AC-15.4 [Prototype]** Given a material change is marked, when an included guest views the item, then the current value and a changed timestamp or label are visible without relying on color.
- **AC-15.5 [Prototype]** Given the organizer has reviewed a material change, when the marker is cleared, then current content remains and no message or notification is implied.
- **AC-15.6 [Prototype]** Given lodging guidance is displayed, when a guest reads it, then the product states that reservation remains the guest's external responsibility and does not imply an invitation or booking.
- **AC-15.7 [Prototype]** Given a content save fails, is uncertain, or is stale, when recovery appears, then it names the affected item, preserves prior saved content and retained input, and offers retry or a current-state check before another write.

## Deferred scope decisions

These items are intentionally outside the first-version requirements. They are not silently included in any story above.

| Item | Decision still needed |
|---|---|
| Reminders | Whether reminders solve a validated organizer job, who controls them, and how consent and delivery are handled |
| Meal choices | Whether choices attach to each person and event, including deadlines and correction behavior |
| Plus-ones | Whether unnamed guests are allowed, who may create or name them, and how invitation authority works |
| Exports | Which decision an export supports, its fields, privacy boundary, and freshness |
| Co-organizers | Whether separate organizer identities are required and how their authority and conflicting changes work |
| Custom fonts | Whether brand value justifies loading, licensing, readability, and performance constraints |
| Free-canvas editing | Whether unrestricted layout control is worth the accessibility, responsiveness, and recovery risk |

Promotion from Deferred requires a traced business outcome, product behavior, atomic criteria, and evidence that the first-version boundary should change.
