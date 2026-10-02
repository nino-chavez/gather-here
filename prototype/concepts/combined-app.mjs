import { applyGuestTheme, readStore, normalizeStyle } from "./style-config.mjs";
import {
  SOURCE_LABELS, answerFor, archivedRepliesFor, attendanceRequestFor, cancelContentDraft, cancelEventDraft, cancelPersonDraft,
  checkAuthoring, retryAuthoring, checkUncertain, chooseAttendanceRequest, clearContentChange, completionFor, contentForGuest, createCombinedScene,
  deriveTotals, discardDraft, enterOrganizerPreview, eventFor, eventReadiness, exitOrganizerPreview,
  filteredAttendanceRequests, guestAttendanceRequests, guestFor, guestInvitations, guestSave, hasDraft, invitedPeopleForEvent,
  organizerSave, questionFor, reconcileStale, representedGuestIds, requestForGuestEvent, responseFor, retryLoaded,
  retryPendingSave, runScenarioAction, saveContentDraft, saveEventDraft, savePersonDraft,
  setDraft, setSimulationState, startContentDraft, startEventDraft, startPersonDraft,
} from "./combined-state.mjs";

const frame = document.querySelector("#product-frame");
const announcer = document.querySelector("#announcer");
const controls = Object.fromEntries(["role", "scenario", "state"].map((key) => [key, document.querySelector(`#${key}-select`)]));
const params = new URLSearchParams(location.search);
const isEmbeddedPreview = params.get("preview") === "true" && window.parent !== window;
document.documentElement.dataset.preview = String(isEmbeddedPreview);
let previewStyle = null;
for (const [key, input] of Object.entries(controls)) if ([...input.options].some((option) => option.value === params.get(key))) input.value = params.get(key);
let fixture;
let scene;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const label = (answer) => ({ accepted: "Attending", declined: "Not attending", unanswered: "Unanswered" })[answer] ?? answer;
const time = (event) => {
  const a = event?.authoring;
  if (a?.date && a?.startTime) {
    const date = new Intl.DateTimeFormat("en-US", {timeZone:"UTC", weekday:"short",month:"short",day:"numeric"}).format(new Date(`${a.date}T12:00:00Z`));
    const wallTime = new Intl.DateTimeFormat("en-US", {timeZone:"UTC",hour:"numeric",minute:"2-digit"}).format(new Date(`${a.date}T${a.startTime}:00Z`));
    const zone = new Intl.DateTimeFormat("en-US", {timeZone:a.timezone,timeZoneName:"short"}).formatToParts(new Date(event.startsAt || `${a.date}T12:00:00Z`)).find((part) => part.type === "timeZoneName")?.value ?? a.timezone;
    return `${date}, ${wallTime} ${zone}`;
  }
  return "Date and time not set";
};
const changedTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat("en-US", {month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date);
};
const selected = () => {
  const scope = scene.ui.role === "guest" ? guestAttendanceRequests(scene, scene.ui.activeGuestId) : scene.attendanceRequests;
  return scope.find((request) => request.id === scene.ui.selectionId) ?? scope[0];
};
const personName = (id) => guestFor(scene, id)?.name ?? "Selected guest";
const eventName = (id) => eventFor(scene, id)?.name ?? "Selected event";
const questionName = (id) => questionFor(scene, id)?.name ?? "Attendance question";
const coveredEventNames = (request) => request.coveredEventIds.map(eventName);
const actorName = (id) => guestFor(scene, id)?.name ?? scene.organizers.find((organizer) => organizer.id === id)?.name ?? "Recorded organizer";
const checked = (value) => value ? "checked" : "";
const selectedOption = (value, expected) => value === expected ? "selected" : "";

function announce(message) { announcer.textContent = ""; requestAnimationFrame(() => { announcer.textContent = message; }); }
function active(section, current) { return section === current ? 'aria-current="page" class="is-active"' : ""; }
function status(answer) { return `<span class="status status-${esc(answer)}"><i aria-hidden="true"></i>${esc(label(answer))}</span>`; }
function notice() {
  if (!scene.ui.notice) return "";
  const uncertain = /could not confirm|until checked/i.test(scene.ui.notice);
  const warning = /Could not|could not|No reply was saved|not saved|discarded|stays draft|before making/i.test(scene.ui.notice);
  return `<div class="notice ${warning ? "notice-warning" : ""}" role="status"><strong>${uncertain ? "Not confirmed" : warning ? "Needs attention" : "Current state"}</strong><span>${esc(scene.ui.notice)}</span>${scene.ui.authoringAttempt ? `<button data-action="${scene.ui.authoringAttempt.state === "failed" ? "retry-authoring" : "check-authoring"}">${scene.ui.authoringAttempt.state === "failed" ? "Retry organizer change" : "Check organizer change"}</button>` : ""}</div>`;
}

function controlState() {
  if (scene.ui.viewState === "loading") return `<section class="state-panel" aria-busy="true"><div class="skeleton"></div><div class="skeleton short"></div><h2>Loading replies</h2><p>Your saved replies will appear here when they load. Unsaved choices stay on this page.</p></section>`;
  if (scene.ui.viewState === "load-error") return `<section class="state-panel state-error" role="alert"><h2>Replies did not load</h2><p>Your saved replies and unsaved choices have not changed.</p><button data-action="retry-load">Try loading again</button></section>`;
  if (scene.ui.viewState === "stale" && !scene.ui.staleAuthoring) return `<section class="state-panel state-error" role="alert"><h2>Replies changed elsewhere</h2><p>The totals and person details may describe different saved versions. Refresh them together before editing.</p><button data-action="reconcile">Refresh saved replies and totals</button></section>`;
  if (scene.ui.viewState === "empty") return `<section class="state-panel"><h2>${scene.ui.role === "guest" ? "Your invitation is not ready yet" : "Start with the weekend"}</h2><p>${scene.ui.role === "guest" ? "The couple has not added your events. Check back after they share your invitation." : "No event has been added in this fictional first-use view."}</p>${scene.ui.role === "organizer" ? '<button data-action="leave-empty-add-event">Add the first event</button>' : ""}</section>`;
  return "";
}

function header(role) {
  const guest = role === "guest";
  const current = guest ? scene.ui.section : scene.ui.organizerSection;
  const nav = guest
    ? `<nav aria-label="Guest programme"><button data-action="guest-section" data-section="reply" ${active("reply", current)}>Reply</button><button data-action="guest-section" data-section="review" ${active("review", current)}>Review all replies</button><button data-action="guest-section" data-section="weekend" ${active("weekend", current)}>Weekend</button><button data-action="guest-section" data-section="travel" ${active("travel", current)}>Travel</button><button data-action="guest-section" data-section="updates" ${active("updates", current)}>Updates</button></nav>`
    : `<nav aria-label="Organizer workspace"><button data-action="organizer-section" data-section="replies" ${active("replies", current)}>Replies</button><button data-action="organizer-section" data-section="people" ${active("people", current)}>People</button><button data-action="organizer-section" data-section="events" ${active("events", current)}>Events</button><button data-action="organizer-section" data-section="content" ${active("content", current)}>Weekend &amp; travel</button><a href="site-style.html">Site style</a></nav>`;
  const organizerTitle = { replies: "Replies", people: "People", events: "Events", content: "Weekend & travel" }[scene.ui.organizerSection] ?? "Replies";
  return `<header class="product-header"><div class="couple-mark"><span>Mara Ellison</span><b>&amp;</b><span>Dev Sato</span></div><div class="product-heading"><p class="wedding-place">Cedar Vale · June 14–16, 2030</p><h1>${guest ? ({ reply: "Your replies", review: "Your saved replies", weekend: "Celebrate with us", travel: "Plan your visit", updates: "Weekend updates", recovery: "Your invitation" }[scene.ui.section] ?? "Your invitation") : organizerTitle}</h1><p class="subtitle">${guest ? "Your invitation for Mara and Dev’s wedding weekend" : "Set up invitations and keep replies trustworthy"}</p></div>${nav}</header>`;
}

function scenarioControl() {
  const helpers = { S1: "Review the private Friday scope", S2: "Save the three wedding answers", S3: "Review Mateo’s arrival plan", S4: "Record the wedding correction", S5: "Test the no-reply guard", S6: "Open Benjamin’s current invitation" };
  return `<aside class="scenario-control"><strong>Review case ${esc(scene.ui.scenarioId)}</strong><span>Scenario helpers demonstrate a fictional case. Only changing the case or Reset rebuilds its records.</span><button data-action="scenario">${helpers[scene.ui.scenarioId]}</button></aside>`;
}

function guestScope() {
  const ids = representedGuestIds(scene, scene.ui.activeGuestId);
  const requests = guestAttendanceRequests(scene, scene.ui.activeGuestId);
  const totals = deriveTotals(scene, requests);
  return `<aside class="guest-scope"><h2>Your invitation</h2><p><strong>Replying as ${esc(personName(scene.ui.activeGuestId))}</strong></p><p>${ids.length > 1 ? `You can also reply for ${esc(ids.slice(1).map(personName).join(" and "))}. Each person's answer stays separate.` : "Your answers apply only to you."}</p><p class="remaining"><strong>${totals.unanswered}</strong> ${totals.unanswered === 1 ? "reply needed" : "replies needed"}</p></aside>`;
}

function guestQuestionRows() {
  return guestAttendanceRequests(scene, scene.ui.activeGuestId).slice().sort((a, b) => new Date(eventFor(scene, a.coveredEventIds[0]).startsAt) - new Date(eventFor(scene, b.coveredEventIds[0]).startsAt)).map((request) => {
    const response = responseFor(scene, request.id)?.answer ?? "unanswered";
    return `<button class="event-row ${scene.ui.selectionId === request.id ? "is-selected" : ""}" data-action="choose" data-id="${request.id}"><span>${esc(time(eventFor(scene, request.coveredEventIds[0])))}</span><strong>${esc(questionName(request.questionId))}</strong><small>${esc(personName(request.guestId))} · ${esc(coveredEventNames(request).join(" and "))}</small>${status(response)}${hasDraft(scene, request.id) ? '<em>Unsaved</em>' : ""}</button>`;
  }).join("");
}

function scheduleRows() {
  const invitations = guestInvitations(scene, scene.ui.activeGuestId);
  const eventIds = [...new Set(invitations.map((item) => item.eventId))];
  return eventIds.sort((a, b) => new Date(eventFor(scene, a).startsAt) - new Date(eventFor(scene, b).startsAt)).map((eventId) => {
    const event = eventFor(scene, eventId);
    const people = invitations.filter((item) => item.eventId === eventId);
    const question = questionFor(scene, event.attendanceQuestionId);
    const coverage = question?.eventIds.length > 1 ? `<p class="schedule-coverage">One answer covers ${esc(question.eventIds.map(eventName).join(" and "))}</p>` : "";
    const rows = people.map((invitation) => {
      const request = requestForGuestEvent(scene, invitation.guestId, eventId);
      const name = personName(invitation.guestId);
      return request
        ? `<button class="schedule-person" data-action="choose" data-id="${request.id}" aria-label="${esc(name)} — ${esc(event.name)}: ${esc(label(responseFor(scene, request.id)?.answer ?? "unanswered"))}"><strong>${esc(name)}</strong>${status(responseFor(scene, request.id)?.answer ?? "unanswered")}</button>`
        : `<p class="schedule-person"><strong>${esc(name)}</strong><span class="status status-no-reply">No reply needed</span></p>`;
    }).join("");
    return `<section class="schedule-row"><span class="schedule-time">${esc(time(event))}</span><h3>${esc(event.name)}</h3><p>${esc(event.authoring?.locationToFollow ? "Location to follow" : event.authoring?.venueName ?? "")}</p>${coverage}<div class="schedule-people">${rows}</div></section>`;
  }).join("");
}

function history(requestId) {
  if (!scene.ui.historyOpen) return "";
  const entries = scene.responseHistory.filter((entry) => entry.requestId === requestId).slice().reverse();
  if (!entries.length) return "";
  return `<section class="history"><h3>Saved changes</h3>${entries.length ? `<ol>${entries.map((entry) => `<li><strong>${esc(label(entry.answer))}</strong><span>${esc(SOURCE_LABELS[entry.source] ?? entry.source)} · ${esc(actorName(entry.actorId))}</span></li>`).join("")}</ol>` : "<p>No earlier saved reply is recorded.</p>"}</section>`;
}

function inlineReplyReview(request, response, answer) {
  if (!hasDraft(scene, request.id)) return "";
  return `<section class="reply-review" aria-label="Review reply change"><h3>Review this reply</h3><dl><div><dt>Person</dt><dd>${esc(personName(request.guestId))}</dd></div><div><dt>Reply for</dt><dd>${esc(questionName(request.questionId))}</dd></div><div><dt>Prior saved reply</dt><dd>${esc(label(response))}</dd></div><div><dt>Proposed reply</dt><dd>${esc(label(answer))}</dd></div><div><dt>Events covered</dt><dd>${esc(coveredEventNames(request).join(" and "))}</dd></div></dl></section>`;
}

function replyEditor(role) {
  const request = selected();
  if (!request) return `<section class="state-panel"><h2>No attendance question selected</h2><p>Choose a person and attendance question.</p></section>`;
  const response = responseFor(scene, request.id)?.answer ?? "unanswered";
  const answer = answerFor(scene, request.id);
  const guest = personName(request.guestId);
  const question = questionFor(scene, request.questionId);
  const events = request.coveredEventIds.map((eventId) => eventFor(scene, eventId));
  const firstEvent = events[0];
  const readOnly = scene.ui.readOnlyPreview || scene.ui.organizerPreview;
  const sourcePicker = role === "organizer" ? `<label class="source-field">How did this answer arrive?<select data-action="source"><option value="guest_told_us" ${selectedOption(scene.ui.sourceChoice, "guest_told_us")}>Guest told us</option><option value="phone_report" ${selectedOption(scene.ui.sourceChoice, "phone_report")}>Phone report</option><option value="organizer_correction" ${selectedOption(scene.ui.sourceChoice, "organizer_correction")}>Organizer correction</option></select></label>` : "";
  const back = role === "organizer" ? '<button class="text-button back-to-list" data-action="back-list">Back to invitations</button>' : "";
  const headingMeta = role === "organizer" ? `<p class="heading-meta">${esc(guest)}</p>` : "";
  const pending = scene.ui.pendingSave?.requestId === request.id ? scene.ui.pendingSave : null;
  const hasSavedChanges = scene.responseHistory.some((entry) => entry.requestId === request.id);
  const saveControls = readOnly
    ? '<p class="read-only-note"><strong>Read-only preview.</strong> Reply choices and saving are unavailable here.</p>'
    : `<fieldset><legend>Will ${esc(guest)} attend?</legend>${["accepted", "declined", "unanswered"].map((value) => `<label><input type="radio" name="answer" value="${value}" data-action="draft" ${answer === value ? "checked" : ""}> ${label(value)}</label>`).join("")}</fieldset>${sourcePicker}${inlineReplyReview(request, response, answer)}<div class="action-row">${back}<button class="primary" data-action="save" ${hasDraft(scene, request.id) ? "" : "disabled"}>${response === "unanswered" ? "Save reply" : "Save change"}</button>${hasDraft(scene, request.id) ? '<button class="text-button" data-action="discard-draft">Discard unsaved choice</button>' : ""}${pending?.state === "failed" ? '<button class="text-button" data-action="retry-save">Retry this save</button>' : ""}${pending?.state === "uncertain" ? '<button class="text-button" data-action="check-save">Check saved reply</button>' : ""}${hasSavedChanges ? `<button class="text-button" data-action="history">${scene.ui.historyOpen ? "Hide saved changes" : "View saved changes"}</button>` : ""}</div>`;
  return `<section class="editor" aria-labelledby="reply-title" tabindex="-1"><div class="editor-head"><div>${headingMeta}<h2 id="reply-title">${esc(question.name)}</h2><p class="coverage-line"><strong>Covers:</strong> ${esc(events.map((event) => event.name).join(" and "))}</p><p>${esc(time(firstEvent))}${events.length > 1 ? ` · ${esc(time(events.at(-1)))}` : ""}</p><p>${esc(firstEvent.authoring?.locationToFollow ? "Location to follow" : [firstEvent.authoring?.venueName, firstEvent.authoring?.venueLocation].filter(Boolean).join(", "))}</p></div>${status(response)}</div><p class="saved-line">${response === "unanswered" ? "No reply saved yet." : `Current saved reply: ${label(response)}.`}</p>${saveControls}${history(request.id)}</section>`;
}

function guestReview() {
  const requests = guestAttendanceRequests(scene, scene.ui.activeGuestId);
  const totals = deriveTotals(scene, requests);
  const completion = completionFor(scene, requests);
  const summary = completion === "empty" ? "No attendance questions are assigned to this guest."
    : completion === "all-unanswered" ? "Every attendance question is unanswered."
      : completion === "complete" ? "Every represented person's attendance questions have saved replies."
        : "Some attendance questions still need a reply. Each person and question is listed below.";
  return `<section class="review"><h2>Review all replies</h2><p>${summary}</p><div class="review-list">${requests.map((request) => `<div><strong>${esc(personName(request.guestId))}</strong><span>${esc(questionName(request.questionId))}${request.coveredEventIds.length > 1 ? ` · ${esc(coveredEventNames(request).join(" and "))}` : ""}</span>${status(responseFor(scene, request.id)?.answer ?? "unanswered")}</div>`).join("")}</div><p class="totals-line">${totals.accepted} attending · ${totals.declined} not attending · ${totals.unanswered} unanswered</p><button class="text-button" data-action="guest-section" data-section="reply">Return to replies</button></section>`;
}

function contentArticle(item) {
  const audience = item.audienceType === "event" ? `${eventName(item.audienceEventId)} invitees` : "All invited guests";
  return `<article class="content-article"><h3>${esc(item.title)}</h3><p>${esc(item.currentBody)}</p>${item.location ? `<p><strong>Location:</strong> ${esc(item.location)}</p>` : ""}${item.link ? `<p><a href="${esc(item.link)}" rel="noopener">Open details</a></p>` : ""}<p class="content-audience">For ${esc(audience)}.${item.kind === "lodging" ? " You arrange any reservation directly; this is guidance, not a booking or invitation." : ""}</p>${item.materialChange ? `<p class="change-marker"><strong>Updated ${esc(changedTime(item.changedAt))}</strong> · Current information shown.</p>` : ""}</article>`;
}

function guestContent() {
  if (scene.ui.section === "recovery") return `<section class="recovery"><h2>${scene.ui.recovered ? "Your current invitation is open" : "This invitation link is out of date"}</h2><p>${scene.ui.recovered ? "Benjamin’s saved replies are unchanged. No other record was shown." : "Request a current link for Benjamin Alexander Okafor-Smith. Recovery does not change replies or show another guest."}</p>${scene.ui.recovered ? '<button class="primary" data-action="guest-section" data-section="weekend">Open your weekend</button>' : '<button class="primary" data-action="scenario">Request current invitation</button>'}</section>`;
  if (scene.ui.section === "review") return guestReview();
  if (scene.ui.section === "weekend") {
    const items = contentForGuest(scene, scene.ui.activeGuestId, "weekend");
    return `<section class="weekend"><h2>Your personal weekend</h2><p>Each event appears once, with the people invited to it. Select a name to view or change a reply. “No reply needed” events are simply part of your schedule.</p><div class="chronology">${scheduleRows()}</div>${items.map(contentArticle).join("")}</section>`;
  }
  if (scene.ui.section === "travel") {
    const items = contentForGuest(scene, scene.ui.activeGuestId).filter((item) => ["travel", "lodging"].includes(item.kind));
    return `<section class="weekend"><h2>Travel and lodging</h2>${items.length ? items.map(contentArticle).join("") : "<p>No travel guidance is available for your invitation.</p>"}</section>`;
  }
  if (scene.ui.section === "updates") {
    const items = contentForGuest(scene, scene.ui.activeGuestId).filter((item) => item.materialChange);
    const changedEvents = guestInvitations(scene, scene.ui.activeGuestId).map((item) => eventFor(scene, item.eventId)).filter((event) => event.state === "changed");
    return `<section class="weekend"><h2>Weekend updates</h2>${changedEvents.map((event) => `<p><strong>${esc(event.name)}:</strong> ${esc(time(event))}. The event changed; your saved reply did not.</p>`).join("")}${items.map(contentArticle).join("")}${!changedEvents.length && !items.length ? "<p>No current changes apply to your invitation.</p>" : ""}</section>`;
  }
  return `${replyEditor("guest")}<section class="other-events"><h3>Reply for another person or event</h3><div class="chronology">${guestQuestionRows()}</div></section>`;
}

function aggregateLabel(invitations) {
  return {empty:"No attendance questions", "all-unanswered":"All unanswered", partial:"Some replies still needed", complete:"All replies received"}[completionFor(scene,invitations)];
}

function staleAuthoringNotice() {
  const record = scene.ui.viewState === "stale" ? scene.ui.staleAuthoring : null;
  if (!record) return "";
  const current = record.kind === "event" ? eventFor(scene,record.id) : record.kind === "person" ? guestFor(scene,record.id) : scene.contentItems.find(item => item.id === record.id);
  const summary = !current ? "No saved record yet." : record.kind === "event" ? `${current.name} · ${time(current)} · ${current.authoring?.venueName || "Location to follow"}` : record.kind === "person" ? `${current.name} · ${scene.eventInvitations.filter(i => i.guestId === current.id).map(i => eventName(i.eventId)).join(", ") || "No assigned events"}` : `${current.title} · ${current.currentBody}`;
  return `<section class="state-panel state-error" role="alert"><h2>Check current ${esc(record.kind)}: ${esc(record.label)}</h2><p>This form may use an older saved version. Your proposed edits remain below; saving is blocked until you check this record.</p><p><strong>Last loaded saved record:</strong> ${esc(summary)}</p><button data-action="reconcile">Check current ${esc(record.kind)}</button></section>`;
}

function organizerFilters() {
  return `<form class="filters"><label><span class="sr-only">Find a person</span><input type="search" value="${esc(scene.ui.search)}" placeholder="Find a person" data-action="search"></label><label><span class="sr-only">Reply status</span><select data-action="reply-view"><option value="unanswered" ${selectedOption(scene.ui.replyView, "unanswered")}>Unanswered questions</option><option value="accepted" ${selectedOption(scene.ui.replyView, "accepted")}>Attending replies</option><option value="declined" ${selectedOption(scene.ui.replyView, "declined")}>Not attending replies</option><option value="all" ${selectedOption(scene.ui.replyView, "all")}>All attendance questions</option></select></label><label><span class="sr-only">Covered event</span><select data-action="event-filter"><option value="all">All events with replies</option>${scene.events.filter((event) => event.responseMode !== "none").map((event) => `<option value="${event.id}" ${selectedOption(scene.ui.eventFilter, event.id)}>${esc(event.name)}</option>`).join("")}</select></label></form>`;
}

function organizerRows() {
  const records = filteredAttendanceRequests(scene);
  return `<div class="record-list">${records.length ? records.map((request) => { const response = responseFor(scene, request.id)?.answer ?? "unanswered"; return `<button class="record-row ${scene.ui.selectionId === request.id ? "is-selected" : ""}" data-action="choose" data-id="${request.id}"><strong>${esc(personName(request.guestId))}</strong><span>${esc(questionName(request.questionId))}${request.coveredEventIds.length > 1 ? ` · ${esc(coveredEventNames(request).join(" and "))}` : ""}</span>${status(response)}${hasDraft(scene, request.id) ? '<em>Unsaved</em>' : ""}</button>`; }).join("") : '<p class="empty-list">No attendance questions match these filters.</p>'}</div>`;
}

function organizerSidebar() {
  if (scene.ui.organizerSection === "replies") return `<aside class="reply-list"><h2>Replies</h2>${organizerFilters()}<p class="aggregate-status">${esc(aggregateLabel(filteredAttendanceRequests(scene)))} · current filter</p>${organizerRows()}</aside>`;
  if (scene.ui.organizerSection === "people") return `<aside class="reply-list"><div class="list-heading"><h2>People</h2><button class="text-button" data-action="add-person">Add person</button></div><div class="record-list">${scene.guests.map((person) => `<button class="record-row ${scene.ui.selectedPersonId === person.id ? "is-selected" : ""}" data-action="select-person" data-id="${person.id}"><strong>${esc(person.name)}</strong><span>${esc(scene.households.find((item) => item.id === person.householdId)?.name ?? "No group")}</span></button>`).join("")}</div></aside>`;
  if (scene.ui.organizerSection === "events") return `<aside class="reply-list"><div class="list-heading"><h2>Events</h2><button class="text-button" data-action="add-event">Add event</button></div><div class="record-list">${scene.events.map((event) => `<button class="record-row ${scene.ui.selectedEventId === event.id ? "is-selected" : ""}" data-action="select-event" data-id="${event.id}"><strong>${esc(event.name)}</strong><span>${event.authoring?.readiness === "ready" ? "Ready" : "Draft"}</span></button>`).join("")}</div></aside>`;
  return `<aside class="reply-list"><div class="list-heading"><h2>Weekend &amp; travel</h2><button class="text-button" data-action="add-content">Add item</button></div><div class="record-list">${scene.contentItems.map((item) => `<button class="record-row ${scene.ui.selectedContentId === item.id ? "is-selected" : ""}" data-action="select-content" data-id="${item.id}"><strong>${esc(item.title)}</strong><span>${esc(item.kind)} · ${item.materialChange ? "Updated" : "Current"}</span></button>`).join("")}</div></aside>`;
}

function personEditor() {
  const draft = scene.ui.personDraft;
  return `<form class="native-form" data-form="person"><div class="form-heading"><div><h2>${draft.id ? "Edit person" : "Add a person"}</h2><p>People stay distinct even when they share a group.</p></div></div><label>Name<input data-bind="person.name" value="${esc(draft.name)}" autocomplete="off"></label><label>Group<select data-bind="person.householdId"><option value="" ${selectedOption(draft.householdId, "")}>No group</option>${scene.households.map((group) => `<option value="${group.id}" ${selectedOption(draft.householdId, group.id)}>${esc(group.name)}</option>`).join("")}<option value="new" ${selectedOption(draft.householdId, "new")}>Create a new group</option></select></label>${draft.householdId === "new" ? `<label>New group name<input data-bind="person.newGroupName" value="${esc(draft.newGroupName)}"></label>` : ""}<fieldset><legend>Event assignments</legend><p class="form-help">Only ready events can be assigned. Events sharing one attendance question must have the same invited people and are assigned together.</p>${scene.events.map((event) => `<label><input type="checkbox" data-array="person.assignedEventIds" value="${event.id}" ${checked(draft.assignedEventIds.includes(event.id))} ${event.authoring?.readiness === "ready" ? "" : "disabled"}> ${esc(event.name)} <small>${event.authoring?.readiness === "ready" ? event.responseMode === "none" ? "Ready · no reply needed" : event.responseMode === "shared" ? `Ready · shares ${questionName(event.attendanceQuestionId)}` : "Ready · separate question" : "Draft · finish event first"}</small></label>`).join("")}</fieldset><fieldset><legend>Reply authority</legend><p class="form-help">Grouping grants no reply authority. Choose each person this guest may answer for.</p>${scene.guests.filter((person) => person.id !== draft.id).map((person) => `<label><input type="checkbox" data-array="person.delegateForGuestIds" value="${person.id}" ${checked(draft.delegateForGuestIds.includes(person.id))}> ${esc(person.name)}</label>`).join("")}</fieldset><div class="action-row"><button class="primary" data-action="save-person">Save person</button><button class="text-button" data-action="cancel-person">Cancel</button></div></form>`;
}

function peoplePanel() {
  if (scene.ui.personDraft) return personEditor();
  const focus = guestFor(scene, scene.ui.selectedPersonId) ?? scene.guests[0];
  if (!focus) return `<section class="context-panel"><h2>No people yet</h2><p>Add each invited person separately.</p><button class="primary" data-action="add-person">Add person</button></section>`;
  const household = scene.households.find((item) => item.id === focus.householdId);
  const invitations = scene.eventInvitations.filter((item) => item.guestId === focus.id);
  const delegated = scene.delegations.filter((item) => item.delegateGuestId === focus.id && item.state === "active");
  const archived = archivedRepliesFor(scene, focus.id);
  return `<section class="context-panel"><div class="form-heading"><div><h2>${esc(focus.name)}</h2><p>${esc(household?.name ?? "No group")} · grouping grants no reply authority</p></div><button class="primary" data-action="edit-person" data-id="${focus.id}">Edit person &amp; access</button></div><h3>Event assignments</h3>${invitations.length ? invitations.map((invitation) => { const event = eventFor(scene, invitation.eventId); const request = requestForGuestEvent(scene, focus.id, event.id); return `<div class="eligibility"><strong>${esc(event.name)}</strong><span>Invited directly by the organizer${request?.coveredEventIds.length > 1 ? ` · ${esc(questionName(request.questionId))}` : ""}</span>${request ? status(responseFor(scene, request.id)?.answer ?? "unanswered") : '<span class="status status-no-reply"><i aria-hidden="true"></i>No reply needed</span>'}</div>`; }).join("") : "<p>No event assignments. This person has no implied invitation.</p>"}<h3>Reply authority</h3>${delegated.length ? delegated.map((item) => `<p>${esc(focus.name)} may answer for <strong>${esc(personName(item.delegatorGuestId))}</strong> on that person's attendance questions.</p>`).join("") : "<p>No additional reply authority.</p>"}<div class="action-row"><button class="text-button" data-action="preview-person" data-id="${focus.id}">Preview invitation</button>${archived.length ? `<button class="text-button" data-action="archived-history">${scene.ui.archivedHistoryOpen ? "Hide" : "Show"} archived replies (${archived.length})</button>` : ""}</div>${scene.ui.archivedHistoryOpen ? `<section class="history"><h3>Archived replies</h3><ol>${archived.map((entry) => `<li><strong>${esc(questionName(entry.questionId))} · ${esc(label(entry.response?.answer ?? "unanswered"))}</strong><span>${esc(entry.reason)}. Reassignment starts unanswered.</span></li>`).join("")}</ol></section>` : ""}</section>`;
}

function eventEditor() {
  const draft = scene.ui.eventDraft;
  const missing = eventReadiness(draft);
  const responseLocked = draft.id && scene.eventInvitations.some((item) => item.eventId === draft.id);
  return `<form class="native-form" data-form="event"><div class="form-heading"><div><h2>${draft.id ? "Edit event" : "Add an event"}</h2><p>${missing.length ? `Still needed for Ready: ${esc(missing.join(", "))}.` : "This event has the information required for Ready."}</p></div><span class="record-state">${missing.length ? "Draft" : "Ready-capable"}</span></div><label>Event name<input data-bind="event.name" value="${esc(draft.name)}"></label><div class="field-grid"><label>Date<input type="date" data-bind="event.date" value="${esc(draft.date)}"></label><label>Local start time<input type="time" data-bind="event.startTime" value="${esc(draft.startTime)}"></label></div><label>Timezone<input data-bind="event.timezone" value="${esc(draft.timezone)}" placeholder="America/Chicago"></label><label>Optional end time<input type="time" data-bind="event.endTime" value="${esc(draft.endTime)}"></label><label class="check-row"><input type="checkbox" data-bind-check="event.locationToFollow" ${checked(draft.locationToFollow)}> Location to follow</label><div class="field-grid"><label>Venue name<input data-bind="event.venueName" value="${esc(draft.venueName)}" ${draft.locationToFollow ? "disabled" : ""}></label><label>Venue location<input data-bind="event.venueLocation" value="${esc(draft.venueLocation)}" ${draft.locationToFollow ? "disabled" : ""}></label></div><label>Attendance response<select data-bind="event.responseMode" ${responseLocked ? "aria-describedby=\"response-mode-help\"" : ""}><option value="separate" ${selectedOption(draft.responseMode, "separate")}>Separate attendance question</option><option value="shared" ${selectedOption(draft.responseMode, "shared")}>Share an attendance question</option><option value="none" ${selectedOption(draft.responseMode, "none")}>No reply needed</option></select></label>${draft.responseMode === "shared" ? `<label>Shared attendance question<select data-bind="event.attendanceQuestionId"><option value="">Choose a question</option>${scene.attendanceQuestions.filter((question) => question.id === draft.attendanceQuestionId || question.eventIds.every((eventId) => !scene.eventInvitations.some((item) => item.eventId === eventId))).map((question) => `<option value="${question.id}" ${selectedOption(draft.attendanceQuestionId, question.id)}>${esc(question.name)}</option>`).join("")}</select></label>` : ""}<p class="form-help" id="response-mode-help">New events start with a separate question. Once invitations or saved replies exist, this demo blocks response-mode changes instead of rewriting answers.</p><label>Optional notes<textarea data-bind="event.notes">${esc(draft.notes)}</textarea></label><div class="action-row"><button data-action="save-event-draft">Save draft</button><button class="primary" data-action="save-event-ready">Mark ready</button><button class="text-button" data-action="cancel-event">Cancel</button></div></form>`;
}

function eventPanel() {
  if (scene.ui.eventDraft) return eventEditor();
  const event = eventFor(scene, scene.ui.selectedEventId) ?? scene.events[0];
  if (!event) return `<section class="context-panel"><h2>No events yet</h2><p>Add the first part of the weekend.</p><button class="primary" data-action="add-event">Add event</button></section>`;
  const records = invitedPeopleForEvent(scene, event.id);
  const totals = deriveTotals(scene, records.map((record) => record.request));
  const responseSummary = event.responseMode === "none"
    ? `<h3>Attendance response</h3><p class="aggregate-status">No reply needed</p><p>${records.length} ${records.length === 1 ? "person is" : "people are"} invited. This schedule item does not create unanswered replies or attendance totals.</p>`
    : `<h3>Reply totals</h3><p class="aggregate-status">${esc(aggregateLabel(records.map((record) => record.request)))}</p><p>${event.responseMode === "shared" ? `These totals use ${esc(questionName(event.attendanceQuestionId))}, the same person-level answer shared with ${esc(questionFor(scene, event.attendanceQuestionId).eventIds.filter((eventId) => eventId !== event.id).map(eventName).join(" and "))}.` : "These totals use one attendance answer per invited person."}</p><div class="totals-strip"><button data-action="event-total" data-id="${event.id}" data-reply="accepted"><strong>${totals.accepted}</strong><span>Attending</span></button><button data-action="event-total" data-id="${event.id}" data-reply="declined"><strong>${totals.declined}</strong><span>Not attending</span></button><button data-action="event-total" data-id="${event.id}" data-reply="unanswered"><strong>${totals.unanswered}</strong><span>Unanswered</span></button></div>`;
  return `<section class="context-panel"><div class="form-heading"><div><h2>${esc(event.name)}</h2><p>${event.authoring?.readiness === "ready" ? `${esc(time(event))} · ${esc(event.authoring.locationToFollow ? "Location to follow" : `${event.authoring.venueName}, ${event.authoring.venueLocation}`)}` : "Draft · cannot be assigned yet"}</p></div><button class="primary" data-action="edit-event" data-id="${event.id}">Edit event</button></div>${responseSummary}<h3>${event.responseMode === "none" ? "Invited people" : "People behind the totals"}</h3>${records.length ? records.map((record) => `<div class="eligibility"><strong>${esc(record.guest.name)}</strong><span>Invited to ${esc(event.name)}</span>${record.request ? status(record.response?.answer ?? "unanswered") : '<span class="status status-no-reply"><i aria-hidden="true"></i>No reply needed</span>'}</div>`).join("") : "<p>No people are assigned to this event.</p>"}${event.responseMode === "none" ? "" : '<button class="text-button" data-action="reconcile">Refresh replies and totals together</button>'}</section>`;
}

function contentEditor() {
  const draft = scene.ui.contentDraft;
  return `<form class="native-form" data-form="content"><div class="form-heading"><div><h2>${draft.id ? "Edit current information" : "Add current information"}</h2><p>Guests see only the latest saved content for their audience.</p></div></div><label>Content type<select data-bind="content.kind"><option value="weekend" ${selectedOption(draft.kind, "weekend")}>Weekend note</option><option value="travel" ${selectedOption(draft.kind, "travel")}>Travel guidance</option><option value="lodging" ${selectedOption(draft.kind, "lodging")}>Lodging guidance</option></select></label><label>Title<input data-bind="content.title" value="${esc(draft.title)}"></label><label>Current content<textarea data-bind="content.currentBody">${esc(draft.currentBody)}</textarea></label><label>Optional location<input data-bind="content.location" value="${esc(draft.location)}"></label><label>Optional link<input type="url" data-bind="content.link" value="${esc(draft.link)}"></label><label>Audience<select data-bind="content.audienceType"><option value="all" ${selectedOption(draft.audienceType, "all")}>All invited guests</option><option value="event" ${selectedOption(draft.audienceType, "event")}>Invitees to one event</option></select></label>${draft.audienceType === "event" ? `<label>Audience event<select data-bind="content.audienceEventId"><option value="">Choose an event</option>${scene.events.filter((event) => event.authoring?.readiness === "ready").map((event) => `<option value="${event.id}" ${selectedOption(draft.audienceEventId, event.id)}>${esc(event.name)}</option>`).join("")}</select></label>` : ""}<label class="check-row"><input type="checkbox" data-bind-check="content.materialChange" ${checked(draft.materialChange)}> Mark as a material change for this audience</label>${draft.kind === "lodging" ? '<p class="form-help">Lodging stays guidance. Guests arrange reservations outside this prototype.</p>' : ""}<div class="action-row"><button class="primary" data-action="save-content">Save current information</button><button class="text-button" data-action="cancel-content">Cancel</button></div></form>`;
}

function contentPanel() {
  if (scene.ui.contentDraft) return contentEditor();
  const item = scene.contentItems.find((content) => content.id === scene.ui.selectedContentId) ?? scene.contentItems[0];
  if (!item) return `<section class="context-panel"><h2>No weekend information yet</h2><p>Add current guidance and choose exactly who sees it.</p><button class="primary" data-action="add-content">Add information</button></section>`;
  const audience = item.audienceType === "event" ? `${eventName(item.audienceEventId)} invitees` : "All invited guests";
  return `<section class="context-panel"><div class="form-heading"><div><h2>${esc(item.title)}</h2><p>${esc(item.kind)} · ${esc(audience)}</p></div><button class="primary" data-action="edit-content" data-id="${item.id}">Edit information</button></div><div class="current-copy"><h3>Current content</h3><p>${esc(item.currentBody)}</p>${item.location ? `<p><strong>Location:</strong> ${esc(item.location)}</p>` : ""}${item.kind === "lodging" ? "<p><strong>Reservation responsibility:</strong> Guests arrange reservations directly.</p>" : ""}</div>${item.materialChange ? `<div class="notice"><strong>Marked as changed</strong><span>${esc(changedTime(item.changedAt))} · shown only to ${esc(audience)}.</span></div><button class="text-button" data-action="clear-change" data-id="${item.id}">Clear change marker after review</button>` : "<p>No current change marker.</p>"}</section>`;
}

function organizerContent() {
  if (scene.ui.organizerSection === "people") return peoplePanel();
  if (scene.ui.organizerSection === "events") return eventPanel();
  if (scene.ui.organizerSection === "content") return contentPanel();
  return replyEditor("organizer");
}

function organizer() {
  return `<div class="prototype organizer-shell">${header("organizer")}<div class="organizer-grid ${scene.ui.mobileList ? "mobile-list" : "mobile-editor"}">${organizerSidebar()}<section class="work-pane">${scene.ui.organizerSection !== "replies" ? `<button class="text-button back-to-list" data-action="back-list">Back to ${scene.ui.organizerSection === "content" ? "weekend information" : scene.ui.organizerSection}</button>` : ""}${staleAuthoringNotice()}${notice()}${organizerContent()}</section></div></div>`;
}

function guest() {
  const previewBanner = scene.ui.readOnlyPreview ? `<div class="preview-return">${scene.ui.organizerPreview ? '<button class="text-button" data-action="return-organizer">Return to organizer</button>' : ""}<span><strong>Read-only preview</strong> · reply saving is unavailable and no record can change</span></div>` : "";
  return `${previewBanner}<div class="prototype guest-shell" data-page="${esc(scene.ui.section)}">${header("guest")}<div class="guest-grid">${guestScope()}<section class="guest-main">${notice()}${guestContent()}</section></div></div>`;
}

const sceneKey = () => `wedding-prototype-scene-v04-${controls.scenario.value}`;
function render() {
  if (scene && !isEmbeddedPreview && !scene.ui.organizerPreview) {
    try { sessionStorage.setItem(sceneKey(), JSON.stringify(scene)); } catch { /* Demo still works without storage. */ }
  }
  document.documentElement.classList.toggle("text-200", scene.ui.viewState === "large-text");
  document.querySelector("#review-selection").textContent = `${controls.role.value} · ${controls.scenario.value} · ${controls.state.value}`;
  document.querySelector("#review-scenario").innerHTML = scenarioControl();
  const state = controlState();
  frame.innerHTML = state || (scene.ui.role === "guest" ? guest() : organizer());
  const guestRoot = document.querySelector(".guest-shell");
  if (guestRoot) applyGuestTheme(guestRoot, previewStyle ?? readStore(localStorage).applied);
  const list = document.querySelector(".record-list");
  if (list && Number.isFinite(scene.ui.listScroll)) list.scrollTop = scene.ui.listScroll;
}

function reset({ restore = false } = {}) {
  scene = createCombinedScene(fixture, controls.scenario.value, controls.state.value);
  if (restore) {
    try { const stored = JSON.parse(sessionStorage.getItem(sceneKey())); if (stored?.ui?.scenarioId === controls.scenario.value) scene = stored; } catch { /* Retain fresh fixture on corrupt demo storage. */ }
  }
  scene.ui.role = controls.role.value;
  scene.ui.readOnlyPreview = isEmbeddedPreview;
  if (scene.ui.role === "organizer" && ["replies", "people", "events", "content"].includes(params.get("section"))) scene.ui.organizerSection = params.get("section");
  if (["reply", "review", "weekend", "travel", "updates"].includes(params.get("section"))) scene.ui.section = params.get("section");
  render();
  announce(`Reset ${controls.scenario.value}.`);
}

try {
  fixture = await fetch("./data/concept-data.json").then((response) => { if (!response.ok) throw new Error(); return response.json(); });
  reset({ restore: true });
} catch {
  frame.innerHTML = '<section class="state-panel state-error"><h1>Prototype data did not load</h1><p>The fictional fixture could not be loaded.</p></section>';
}

document.querySelector("#scenario-select").addEventListener("change", reset);
document.querySelector("#reset-button").addEventListener("click", reset);
document.querySelector("#role-select").addEventListener("change", () => {
  if (scene.ui.organizerPreview) exitOrganizerPreview(scene);
  scene.ui.role = controls.role.value;
  render();
});
document.querySelector("#state-select").addEventListener("change", () => {
  setSimulationState(scene, controls.state.value);
  render();
});

frame.addEventListener("submit", (event) => event.preventDefault());

function setBoundValue(target) {
  const [kind, field] = (target.dataset.bind ?? target.dataset.bindCheck ?? "").split(".");
  const draft = kind === "event" ? scene.ui.eventDraft : kind === "person" ? scene.ui.personDraft : scene.ui.contentDraft;
  if (!draft || !field) return;
  draft[field] = target.dataset.bindCheck ? target.checked : target.value;
}

frame.addEventListener("change", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === "draft") setDraft(scene, selected().id, target.value);
  if (action === "source") scene.ui.sourceChoice = target.value;
  if (action === "reply-view") scene.ui.replyView = target.value;
  if (action === "event-filter") scene.ui.eventFilter = target.value;
  if (action === "search") scene.ui.search = target.value;
  if (target.dataset.bind || target.dataset.bindCheck) setBoundValue(target);
  if (target.dataset.bind && target.tagName !== "SELECT") return;
  if (target.dataset.array) {
    const [kind, field] = target.dataset.array.split(".");
    const draft = kind === "person" ? scene.ui.personDraft : null;
    if (draft) draft[field] = target.checked ? [...new Set([...draft[field], target.value])] : draft[field].filter((value) => value !== target.value);
  }
  if (["reply-view", "event-filter"].includes(action)) {
    const visible = filteredAttendanceRequests(scene);
    if (visible.length && !visible.some((request) => request.id === scene.ui.selectionId)) chooseAttendanceRequest(scene, visible[0].id);
  }
  const value = target.value;
  render();
  const selector = action === "draft" ? `[data-action="draft"][value="${CSS.escape(value)}"]` : target.dataset.bind ? `[data-bind="${target.dataset.bind}"]` : action ? `[data-action="${action}"]` : null;
  if (selector) document.querySelector(selector)?.focus({ preventScroll: true });
});

frame.addEventListener("input", (event) => {
  const target = event.target;
  if (target.dataset.action === "search") {
    scene.ui.search = target.value;
    render();
    document.querySelector('[data-action="search"]')?.focus();
    return;
  }
  if (target.dataset.bind) setBoundValue(target);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !scene) return;
  const action = button.dataset.action;
  const priorList = document.querySelector(".record-list");
  if (priorList) scene.ui.listScroll = priorList.scrollTop;
  if (action === "choose") { chooseAttendanceRequest(scene, button.dataset.id); if (scene.ui.role === "guest") scene.ui.section = "reply"; }
  if (action === "guest-section") scene.ui.section = button.dataset.section;
  if (action === "organizer-section") { scene.ui.organizerSection = button.dataset.section; scene.ui.mobileList = true; if (button.dataset.section === "people" && !scene.ui.selectedPersonId) scene.ui.selectedPersonId = scene.guests[0]?.id; }
  if (action === "history") scene.ui.historyOpen = !scene.ui.historyOpen;
  if (action === "archived-history") scene.ui.archivedHistoryOpen = !scene.ui.archivedHistoryOpen;
  if (action === "back-list") scene.ui.mobileList = true;
  if (action === "save") {
    const request = selected();
    const result = scene.ui.role === "guest" ? guestSave(scene, request.id, answerFor(scene, request.id)) : organizerSave(scene, request.id, answerFor(scene, request.id), scene.ui.sourceChoice ?? "guest_told_us");
    announce(scene.ui.notice ?? result.state);
  }
  if (action === "discard-draft") discardDraft(scene, selected().id);
  if (action === "retry-save") retryPendingSave(scene);
  if (action === "retry-authoring") retryAuthoring(scene);
  if (action === "check-authoring") checkAuthoring(scene);
  if (action === "retry-load") retryLoaded(scene);
  if (action === "check-save") checkUncertain(scene, selected().id);
  if (action === "reconcile") reconcileStale(scene);
  if (action === "scenario") { runScenarioAction(scene); announce(scene.ui.notice ?? "Scenario action completed."); }
  if (action === "event-total") {
    scene.ui.eventFilter = button.dataset.id;
    scene.ui.search = "";
    scene.ui.replyView = button.dataset.reply ?? "all";
    scene.ui.organizerSection = "replies";
    const record = filteredAttendanceRequests(scene)[0];
    if (record) chooseAttendanceRequest(scene, record.id);
  }
  if (action === "return-organizer") { exitOrganizerPreview(scene); controls.role.value = "organizer"; }
  if (action === "preview-person") { enterOrganizerPreview(scene, button.dataset.id); controls.role.value = "guest"; }
  if (action === "select-person") { scene.ui.selectedPersonId = button.dataset.id; scene.ui.personDraft = null; scene.ui.archivedHistoryOpen = false; scene.ui.mobileList = false; }
  if (action === "add-person") { startPersonDraft(scene); scene.ui.mobileList = false; }
  if (action === "edit-person") startPersonDraft(scene, button.dataset.id);
  if (action === "save-person") savePersonDraft(scene);
  if (action === "cancel-person") cancelPersonDraft(scene);
  if (action === "select-event") { scene.ui.selectedEventId = button.dataset.id; scene.ui.eventDraft = null; scene.ui.mobileList = false; }
  if (action === "add-event") { startEventDraft(scene); scene.ui.mobileList = false; }
  if (action === "edit-event") startEventDraft(scene, button.dataset.id);
  if (action === "save-event-draft") saveEventDraft(scene, false);
  if (action === "save-event-ready") saveEventDraft(scene, true);
  if (action === "cancel-event") cancelEventDraft(scene);
  if (action === "leave-empty-add-event") { setSimulationState(scene, "ready"); controls.state.value = "ready"; scene.ui.organizerSection = "events"; startEventDraft(scene); }
  if (action === "select-content") { scene.ui.selectedContentId = button.dataset.id; scene.ui.contentDraft = null; scene.ui.mobileList = false; }
  if (action === "add-content") { startContentDraft(scene); scene.ui.mobileList = false; }
  if (action === "edit-content") startContentDraft(scene, button.dataset.id);
  if (action === "save-content") saveContentDraft(scene);
  if (action === "cancel-content") cancelContentDraft(scene);
  if (action === "clear-change") clearContentChange(scene, button.dataset.id);
  render();
  const viewActions = ["guest-section", "organizer-section", "select-person", "select-event", "select-content", "return-organizer", "preview-person", "back-list"];
  const formActions = ["add-person", "edit-person", "add-event", "edit-event", "add-content", "edit-content"];
  const saveActions = ["save", "save-person", "save-event-draft", "save-event-ready", "save-content", "retry-authoring", "check-authoring", "retry-save", "check-save", "cancel-person", "cancel-event", "cancel-content"];
  const focusTarget = formActions.includes(action) ? frame.querySelector('.native-form input')
    : saveActions.includes(action) ? frame.querySelector('.notice, .work-pane h2, h1')
    : viewActions.includes(action) ? frame.querySelector('h1') : null;
  if (focusTarget) { if (!focusTarget.matches('input,button,select,textarea,a')) focusTarget.setAttribute('tabindex','-1'); focusTarget.focus({preventScroll:true}); }
  if (action === "choose") {
    const editor = document.querySelector(".editor");
    const top = editor?.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight / 2) editor?.scrollIntoView({ block: "start", behavior: "instant" });
    editor?.focus({ preventScroll: true });
  }
});

window.addEventListener("message", (event) => {
  if (!isEmbeddedPreview || event.origin !== location.origin || event.source !== window.parent || event.data?.type !== "wedding-style-preview" || !scene) return;
  try { previewStyle = normalizeStyle(event.data.style); } catch { return; }
  if (["reply", "review", "weekend", "travel", "updates"].includes(event.data.section) && (scene.ui.scenarioId !== "S6" || scene.ui.recovered)) scene.ui.section = event.data.section;
  render();
});
window.addEventListener("storage", (event) => { if (event.key === "wedding-prototype-style-v1" && !isEmbeddedPreview && scene) render(); });
if (isEmbeddedPreview) window.parent.postMessage({ type: "wedding-preview-ready" }, location.origin);
