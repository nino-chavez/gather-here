import {
  ANSWERS,
  RESPONSE_MODES,
  applyScenarioAction,
  attendanceRequestFor,
  completionFor,
  deriveTotals,
  eventFor,
  guestAttendanceRequests,
  guestFor,
  guestInvitations,
  invitationFor,
  invitedPeopleForEvent,
  prepareScene,
  questionFor,
  questionScopeCompatible,
  representedGuestIds,
  requestForGuestEvent,
  responseFor,
  saveAnswer,
} from "./state.mjs";

export {
  attendanceRequestFor,
  completionFor,
  deriveTotals,
  eventFor,
  guestAttendanceRequests,
  guestFor,
  guestInvitations,
  invitationFor,
  invitedPeopleForEvent,
  questionFor,
  representedGuestIds,
  requestForGuestEvent,
  responseFor,
};

export const SOURCE_LABELS = {
  guest_told_us: "Guest told us",
  phone_report: "Phone report",
  organizer_correction: "Organizer correction",
  guest: "Guest reply",
  delegate: "Reply contact",
  organizer_phone_report: "Phone report",
  organizer_guest_report: "Recorded by organizer · guest told us",
};

const clone = (value) => structuredClone(value);
const isoDate = (value) => String(value ?? "").slice(0, 10);
const isoTime = (value) => String(value ?? "").match(/T(\d{2}:\d{2})/)?.[1] ?? "";
const slug = (value) => String(value).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase() || "record";
const uniqueId = (prefix, seed, existing) => {
  const base = `${prefix}_${slug(seed)}`;
  let id = base;
  let suffix = 2;
  while (existing.has(id)) id = `${base}_${suffix++}`;
  return id;
};

function initializeAuthoring(scene) {
  scene.attendanceQuestions ??= [];
  scene.attendanceRequests ??= [];
  for (const event of scene.events) {
    const location = scene.locations.find((item) => item.id === event.locationId);
    event.responseMode ??= "separate";
    event.attendanceQuestionId ??= null;
    event.authoring ??= {
      date: isoDate(event.startsAt),
      startTime: isoTime(event.startsAt),
      timezone: "America/Chicago",
      endTime: "",
      venueName: location?.name ?? "",
      venueLocation: location?.place ?? "",
      locationToFollow: false,
      notes: "",
      readiness: "ready",
    };
  }
  scene.archivedReplyHistory ??= [];
  scene.archivedInvitationIds ??= [];
  scene.contentItems = (scene.travelInformation ?? []).map((item) => ({
    ...item,
    kind: item.kind ?? "lodging",
    body: item.currentBody ?? item.body ?? "",
    currentBody: item.currentBody ?? item.body ?? "",
    location: item.location ?? "",
    link: item.link ?? "",
    audienceType: item.audienceType ?? "all",
    audienceEventId: item.audienceEventId ?? null,
    materialChange: item.materialChange ?? false,
    changedAt: item.changedAt ?? null,
  }));
}

export function createCombinedScene(fixture, scenarioId = "S1", viewState = "ready") {
  const scene = prepareScene(fixture, scenarioId, "ready");
  initializeAuthoring(scene);
  Object.assign(scene.ui, {
    viewState,
    role: "guest",
    section: scenarioId === "S6" ? "recovery" : "reply",
    organizerSection: "replies",
    replyView: "unanswered",
    eventFilter: "all",
    search: "",
    selectedPersonId: null,
    selectedEventId: scenarioId === "S5" ? "evt_rehearsal" : scene.events[0]?.id ?? null,
    selectedContentId: scene.contentItems[0]?.id ?? null,
    drafts: {},
    notice: null,
    historyOpen: false,
    archivedHistoryOpen: false,
    mobileList: true,
    organizerPreview: false,
    readOnlyPreview: false,
    previewReturn: null,
    eventDraft: null,
    personDraft: null,
    contentDraft: null,
    pendingSave: null,
    authoringAttempt: null,
    staleVersion: null,
  });
  return scene;
}

export function setSimulationState(scene, viewState) {
  scene.ui.viewState = viewState;
  if (!scene.ui.pendingSave && !scene.ui.authoringAttempt) scene.ui.notice = null;
  if (viewState === "save-error") scene.ui.hasFailedOnce = false;
  if (viewState === "stale") {
    scene.ui.staleVersion = { shown: 1, current: 2 };
    const kind = { events: "event", people: "person", content: "content" }[scene.ui.organizerSection];
    const draft = scene.ui[`${kind}Draft`];
    scene.ui.staleAuthoring = scene.ui.role === "organizer" && draft ? { kind, id: draft.id, label: draft.name || draft.title || `new ${kind}` } : null;
  }
  return scene;
}

export function reconcileStale(scene) {
  scene.ui.viewState = "ready";
  scene.ui.staleVersion = null;
  const record = scene.ui.staleAuthoring;
  scene.ui.staleAuthoring = null;
  scene.ui.notice = record ? `Current saved ${record.kind} checked: ${record.label}. Your proposed edits remain in the form; review them before saving.` : "Current saved replies and totals are shown together.";
}

export function answerFor(scene, requestId) {
  requestId = attendanceRequestFor(scene, requestId)?.id ?? requestId;
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) return responseFor(scene, requestId)?.answer ?? "unanswered";
  return scene.ui.drafts[requestId] ?? responseFor(scene, requestId)?.answer ?? "unanswered";
}

export function setDraft(scene, requestId, answer) {
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) return false;
  const request = attendanceRequestFor(scene, requestId);
  if (!request) return false;
  requestId = request.id;
  if (!ANSWERS.includes(answer)) throw new Error(`Invalid answer: ${answer}`);
  scene.ui.drafts[requestId] = answer;
  return true;
}

export function clearDraft(scene, requestId) {
  const canonical = attendanceRequestFor(scene, requestId)?.id ?? requestId;
  for (const key of Object.keys(scene.ui.drafts)) if (key === requestId || key === canonical || attendanceRequestFor(scene, key)?.id === canonical) delete scene.ui.drafts[key];
}

export function discardDraft(scene, requestId) {
  requestId = attendanceRequestFor(scene, requestId)?.id ?? requestId;
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) return false;
  if (scene.ui.pendingSave?.state === "uncertain") {
    scene.ui.notice = "Check the unconfirmed reply before discarding its choice.";
    return false;
  }
  clearDraft(scene, requestId);
  if (scene.ui.pendingSave?.requestId === requestId) scene.ui.pendingSave = null;
  const request = attendanceRequestFor(scene, requestId);
  if (request) scene.ui.notice = `Unsaved choice discarded for ${guestFor(scene, request.guestId).name} — ${questionFor(scene, request.questionId).name}.`;
  return true;
}

export function hasDraft(scene, requestId) {
  requestId = attendanceRequestFor(scene, requestId)?.id ?? requestId;
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) return false;
  return Object.hasOwn(scene.ui.drafts, requestId) && scene.ui.drafts[requestId] !== (responseFor(scene, requestId)?.answer ?? "unanswered");
}

export function filteredAttendanceRequests(scene) {
  const query = scene.ui.search.trim().toLocaleLowerCase();
  return scene.attendanceRequests.filter((request) => {
    const answer = responseFor(scene, request.id)?.answer ?? "unanswered";
    const guest = guestFor(scene, request.guestId);
    if (scene.ui.replyView !== "all" && answer !== scene.ui.replyView) return false;
    if (scene.ui.eventFilter !== "all" && !request.coveredEventIds.includes(scene.ui.eventFilter)) return false;
    return !query || guest.name.toLocaleLowerCase().includes(query);
  });
}

export const filteredInvitations = filteredAttendanceRequests;

export function chooseAttendanceRequest(scene, requestId) {
  const request = attendanceRequestFor(scene, requestId);
  if (!request) return false;
  if (scene.ui.selectionId !== request.id) scene.ui.notice = null;
  scene.ui.selectionId = request.id;
  scene.ui.selectedPersonId = request.guestId;
  scene.ui.historyOpen = false;
  scene.ui.sourceChoice = "guest_told_us";
  scene.ui.mobileList = false;
  return true;
}

export const chooseInvitation = chooseAttendanceRequest;

function exactScope(scene, requestId, answer) {
  const request = attendanceRequestFor(scene, requestId);
  const question = questionFor(scene, request.questionId);
  return {
    requestId: request.id,
    person: guestFor(scene, request.guestId).name,
    question: question.name,
    eventNames: request.coveredEventIds.map((eventId) => eventFor(scene, eventId).name),
    before: responseFor(scene, request.id)?.answer ?? "unanswered",
    proposed: answer,
  };
}

function saveBlocked(scene) {
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) return "This preview is read-only. No reply was changed.";
  if (scene.ui.authoringAttempt?.state === "uncertain") return "Check the unconfirmed organizer change before making another change.";
  if (scene.ui.pendingSave?.state === "uncertain") return "Check the uncertain save before making another change.";
  if (scene.ui.viewState === "stale") return scene.ui.staleAuthoring ? `Check current ${scene.ui.staleAuthoring.kind}: ${scene.ui.staleAuthoring.label} before saving its proposed edits.` : "Refresh saved replies and totals before making a change.";
  return null;
}

function finishReplySave(scene, requestId, answer, source, role) {
  const blocked = saveBlocked(scene);
  if (blocked) {
    scene.ui.notice = blocked;
    return { state: "blocked", currentAnswerAfter: responseFor(scene, requestId)?.answer ?? "unanswered" };
  }
  const scope = exactScope(scene, requestId, answer);
  if (answer === "unanswered") {
    scene.ui.notice = `No reply was saved for ${scope.person} — ${scope.question}. Choose attending or not attending.`;
    return { state: "no-answer", currentAnswerAfter: scope.before };
  }
  const result = saveAnswer(scene, requestId, answer, source);
  if (["failed", "uncertain"].includes(result.state)) {
    scene.ui.pendingSave = { ...scope, role, source, actorGuestId: role === "guest" ? scene.ui.activeGuestId : null, state: result.state };
    scene.ui.notice = result.state === "failed"
      ? `Could not save ${scope.person} — ${scope.question}: proposed ${answer}; current saved reply remains ${scope.before}. Your choice is retained for retry.`
      : `Could not confirm ${scope.person} — ${scope.question}: proposed ${answer}; current saved reply remains ${scope.before} until checked. Your choice is retained.`;
    return result;
  }
  scene.ui.pendingSave = null;
  clearDraft(scene, requestId);
  return result;
}

export function organizerSave(scene, requestId, answer, sourceChoice) {
  const request = attendanceRequestFor(scene, requestId);
  if (!request) return { state: "blocked" };
  if (!["phone_report", "guest_told_us", "organizer_correction"].includes(sourceChoice)) throw new Error("Choose how the reply arrived.");
  const scope = exactScope(scene, request.id, answer);
  const source = sourceChoice === "phone_report" ? "organizer_phone_report" : sourceChoice === "guest_told_us" ? "organizer_guest_report" : "organizer_correction";
  const result = finishReplySave(scene, request.id, answer, source, "organizer");
  if (result.state !== "saved") return result;
  const current = responseFor(scene, request.id);
  current.savedById = "org_mara";
  current.source = source;
  const latest = scene.responseHistory.at(-1);
  if (latest?.requestId === request.id) { latest.actorId = "org_mara"; latest.source = source; }
  const verb = scope.before === "unanswered" ? "First reply saved" : "Reply changed";
  scene.ui.notice = `${verb}: ${scope.person} — ${scope.question}. Covers ${scope.eventNames.join(" and ")}. Source: ${SOURCE_LABELS[sourceChoice]}.`;
  return { ...result, source };
}

export function guestSave(scene, requestId, answer) {
  const request = attendanceRequestFor(scene, requestId);
  if (!request || !representedGuestIds(scene, scene.ui.activeGuestId).includes(request.guestId)) {
    scene.ui.notice = "You cannot change that person's reply.";
    return { state: "blocked" };
  }
  const scope = exactScope(scene, request.id, answer);
  const source = request.guestId === scene.ui.activeGuestId ? "guest" : "delegate";
  const result = finishReplySave(scene, request.id, answer, source, "guest");
  if (result.state === "saved") scene.ui.notice = `${scope.before === "unanswered" ? "Reply saved" : "Reply changed"}: ${scope.person} — ${scope.question}. Covers ${scope.eventNames.join(" and ")}.`;
  return result;
}

export function retryPendingSave(scene) {
  const pending = scene.ui.pendingSave;
  if (!pending || pending.state !== "failed") return { state: "none" };
  const request = attendanceRequestFor(scene, pending.requestId);
  if (!request || (pending.role === "guest" && !representedGuestIds(scene, pending.actorGuestId ?? scene.ui.activeGuestId).includes(request.guestId))) {
    clearDraft(scene, pending.requestId);
    scene.ui.pendingSave = null;
    scene.ui.notice = "This attendance question or reply permission has been removed. The unsaved choice was discarded.";
    return { state: "blocked" };
  }
  scene.ui.viewState = "ready";
  return pending.role === "organizer"
    ? organizerSave(scene, pending.requestId, pending.proposed, pending.source === "organizer_phone_report" ? "phone_report" : pending.source === "organizer_correction" ? "organizer_correction" : "guest_told_us")
    : guestSave(scene, pending.requestId, pending.proposed);
}

export function checkUncertain(scene, requestId = scene.ui.pendingSave?.requestId) {
  const pending = scene.ui.pendingSave;
  if (!pending || pending.state !== "uncertain" || pending.requestId !== requestId) return { state: "none" };
  scene.ui.viewState = "ready";
  const saved = responseFor(scene, requestId)?.answer ?? "unanswered";
  scene.ui.pendingSave = null;
  scene.ui.notice = `Checked ${pending.person} — ${pending.question}. Current saved reply is ${saved}; proposed ${pending.proposed} was not saved. Your choice is still selected.`;
  return { state: "checked", saved };
}

export function retryLoaded(scene) {
  scene.ui.viewState = "ready";
  scene.ui.notice = "Replies loaded. Your selected question and unsaved choices are unchanged.";
}

export function runScenarioAction(scene) {
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) {
    scene.ui.notice = "This preview is read-only. The review case was not changed.";
    return scene.ui.notice;
  }
  applyScenarioAction(scene);
  clearDraft(scene, scene.ui.selectionId);
  return scene.ui.notice;
}

function authoringGuard(scene, kind, label, options = {}) {
  const blocked = saveBlocked(scene);
  if (blocked) { scene.ui.notice = blocked; return { state: "blocked" }; }
  if (["save-error", "uncertain"].includes(scene.ui.viewState)) {
    const state = scene.ui.viewState === "save-error" ? "failed" : "uncertain";
    scene.ui.authoringAttempt = { kind, label, options, state, draft: clone(scene.ui[`${kind}Draft`]) };
    scene.ui.notice = `${state === "failed" ? "Could not save" : "Could not confirm"} ${label}. The prior saved record remains current; your proposed changes are retained. ${state === "failed" ? "Retry this organizer change or cancel it." : "Check this organizer change before another save."}`;
    return { state };
  }
  scene.ui.authoringAttempt = null;
  return null;
}

export function retryAuthoring(scene) {
  const attempt = scene.ui.authoringAttempt;
  if (!attempt || attempt.state !== "failed") return { state: "blocked" };
  scene.ui[`${attempt.kind}Draft`] = clone(attempt.draft);
  scene.ui.authoringAttempt = null;
  scene.ui.viewState = "ready";
  if (attempt.kind === "event") return saveEventDraft(scene, attempt.options.ready);
  if (attempt.kind === "person") return savePersonDraft(scene);
  return saveContentDraft(scene);
}

export function checkAuthoring(scene) {
  const attempt = scene.ui.authoringAttempt;
  if (!attempt || attempt.state !== "uncertain") return { state: "none" };
  scene.ui.authoringAttempt = null;
  scene.ui.viewState = "ready";
  scene.ui[`${attempt.kind}Draft`] = clone(attempt.draft);
  scene.ui.notice = `Checked ${attempt.label}. The prior saved record is still current; the proposed change was not saved. Your draft is retained.`;
  return { state: "checked" };
}

function cancelAuthoring(scene, kind) {
  if (scene.ui.authoringAttempt?.state === "uncertain") {
    scene.ui.notice = "Check this organizer change before discarding its draft.";
    return false;
  }
  if (scene.ui.authoringAttempt?.kind === kind) scene.ui.authoringAttempt = null;
  scene.ui[`${kind}Draft`] = null;
  return true;
}

export function eventInstant(draft) {
  if (!draft?.date || !draft?.startTime || !draft?.timezone) return null;
  const nominal = Date.parse(`${draft.date}T${draft.startTime}:00Z`);
  if (!Number.isFinite(nominal)) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: draft.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    const wall = (instant) => Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    const offsets = new Set([-36, -12, 0, 12, 36].map((hours) => {
      const sample = nominal + hours * 3600000;
      const parts = wall(sample);
      return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - sample;
    }));
    const matches = [...offsets].map((offset) => nominal - offset).filter((instant) => {
      const parts = wall(instant);
      return `${parts.year}-${parts.month}-${parts.day}` === draft.date && `${parts.hour}:${parts.minute}` === draft.startTime;
    });
    return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
  } catch { return null; }
}

export function eventReadiness(draft) {
  const missing = [];
  if (!draft?.name?.trim()) missing.push("event name");
  if (!draft?.date) missing.push("date");
  if (!draft?.startTime) missing.push("local start time");
  if (!draft?.timezone?.trim()) missing.push("timezone");
  else { try { new Intl.DateTimeFormat("en", { timeZone: draft.timezone }); } catch { missing.push("valid timezone, such as America/Chicago"); } }
  if (draft?.date && draft?.startTime && draft?.timezone && !eventInstant(draft)) missing.push("a valid, unambiguous local start time in that timezone");
  if (!draft?.locationToFollow && !draft?.venueName?.trim()) missing.push("venue name");
  if (!draft?.locationToFollow && !draft?.venueLocation?.trim()) missing.push("venue location");
  if (!RESPONSE_MODES.includes(draft?.responseMode)) missing.push("attendance response choice");
  if (draft?.responseMode === "shared" && !draft?.attendanceQuestionId) missing.push("shared attendance question");
  return missing;
}

export function startEventDraft(scene, eventId = null) {
  const event = eventId ? eventFor(scene, eventId) : null;
  scene.ui.eventDraft = event ? {
    id: event.id,
    name: event.name,
    responseMode: event.responseMode,
    attendanceQuestionId: event.attendanceQuestionId,
    ...clone(event.authoring),
  } : {
    id: null,
    name: "",
    date: "",
    startTime: "",
    timezone: "America/Chicago",
    endTime: "",
    venueName: "",
    venueLocation: "",
    locationToFollow: false,
    notes: "",
    readiness: "draft",
    responseMode: "separate",
    attendanceQuestionId: null,
  };
  scene.ui.selectedEventId = eventId;
  scene.ui.notice = null;
  return scene.ui.eventDraft;
}

export function cancelEventDraft(scene) {
  if (cancelAuthoring(scene, "event")) scene.ui.notice = "Event changes discarded.";
}

function eventHasAssignments(scene, eventId) {
  return scene.eventInvitations.some((invitation) => invitation.eventId === eventId);
}

function eventHasSavedReplies(scene, eventId) {
  return scene.attendanceRequests.some((request) => request.coveredEventIds.includes(eventId) && responseFor(scene, request.id)?.saved);
}

function detachEventQuestion(scene, event) {
  if (!event?.attendanceQuestionId) return;
  const question = questionFor(scene, event.attendanceQuestionId);
  if (!question) return;
  question.eventIds = question.eventIds.filter((eventId) => eventId !== event.id);
  if (!question.eventIds.length) scene.attendanceQuestions = scene.attendanceQuestions.filter((item) => item.id !== question.id);
}

function configureEventResponse(scene, event, draft) {
  if (draft.responseMode === "none") {
    event.responseMode = "none";
    event.attendanceQuestionId = null;
    return { state: "configured" };
  }
  if (draft.responseMode === "separate") {
    const questionId = uniqueId("q", draft.name || event.id, new Set(scene.attendanceQuestions.map((item) => item.id)));
    scene.attendanceQuestions.push({ id: questionId, name: draft.name.trim() || event.name, responseMode: "separate", eventIds: [event.id] });
    event.responseMode = "separate";
    event.attendanceQuestionId = questionId;
    return { state: "configured", questionId };
  }
  const question = questionFor(scene, draft.attendanceQuestionId);
  if (!question) return { state: "invalid", message: "Choose an existing attendance question to share." };
  if (!questionScopeCompatible(scene, question.id, event.id)) return { state: "incompatible", message: `Cannot share ${question.name}. Every covered event must have the same invited people.` };
  if (!question.eventIds.includes(event.id)) question.eventIds.push(event.id);
  question.responseMode = "shared";
  for (const eventId of question.eventIds) {
    const covered = eventFor(scene, eventId);
    covered.responseMode = "shared";
    covered.attendanceQuestionId = question.id;
  }
  return { state: "configured", questionId: question.id };
}

export function saveEventDraft(scene, ready = false) {
  const draft = scene.ui.eventDraft;
  if (!draft) return { state: "none" };
  const blocked = authoringGuard(scene, "event", draft.name || "this event", { ready });
  if (blocked) return blocked;
  const missing = eventReadiness(draft);
  if (ready && missing.length) {
    scene.ui.notice = `Event stays draft. Add ${missing.join(", ")}.`;
    return { state: "invalid", missing };
  }
  let event = draft.id ? eventFor(scene, draft.id) : null;
  const changingResponse = event && (event.responseMode !== draft.responseMode || event.attendanceQuestionId !== (draft.responseMode === "none" ? null : draft.attendanceQuestionId));
  if (changingResponse && (eventHasAssignments(scene, event.id) || eventHasSavedReplies(scene, event.id))) {
    scene.ui.notice = `Attendance response cannot change for ${event.name} while invitations or replies exist. Remove those records first; this local demo does not migrate them.`;
    return { state: "guarded", reason: "existing assignments or replies" };
  }
  // Validate the proposed relationship before detaching or renaming saved records.
  if ((!event || changingResponse) && draft.responseMode === "shared") {
    const question = questionFor(scene, draft.attendanceQuestionId);
    if (!question || !questionScopeCompatible(scene, question.id, event?.id ?? null)) {
      scene.ui.notice = question ? `Cannot share ${question.name}. Every covered event must have the same invited people. Your saved event is unchanged.` : "Choose an existing attendance question to share. Your saved event is unchanged.";
      return { state: question ? "incompatible" : "invalid", reason: scene.ui.notice };
    }
  }
  if (!event) {
    const id = uniqueId("evt", draft.name || "new", new Set(scene.events.map((item) => item.id)));
    event = { id, name: draft.name.trim() || "Untitled event", startsAt: null, locationId: null, state: "draft", responseMode: null, attendanceQuestionId: null, authoring: {} };
    scene.events.push(event);
  } else if (changingResponse) detachEventQuestion(scene, event);

  event.name = draft.name.trim() || "Untitled event";
  if (!event.responseMode || changingResponse) {
    const responseResult = configureEventResponse(scene, event, draft);
    if (responseResult.state !== "configured") {
      if (!draft.id) scene.events = scene.events.filter((item) => item.id !== event.id);
      scene.ui.notice = responseResult.message;
      return responseResult;
    }
  } else if (event.responseMode === "separate") {
    const question = questionFor(scene, event.attendanceQuestionId);
    if (question) question.name = event.name;
  }

  event.authoring = { ...clone(draft), id: undefined, responseMode: undefined, attendanceQuestionId: undefined, readiness: ready ? "ready" : "draft" };
  delete event.authoring.id;
  delete event.authoring.responseMode;
  delete event.authoring.attendanceQuestionId;
  event.state = ready ? "active" : "draft";
  event.startsAt = eventInstant(draft);
  scene.ui.selectedEventId = event.id;
  scene.ui.eventDraft = null;
  const responseLabel = event.responseMode === "none" ? "No reply needed" : event.responseMode === "shared" ? `Shared question: ${questionFor(scene, event.attendanceQuestionId).name}` : "Separate attendance question";
  scene.ui.notice = ready ? `${event.name} is ready. ${responseLabel}.` : `${event.name} saved as a draft. It cannot be assigned until ready.`;
  return { state: ready ? "ready" : "draft", eventId: event.id, missing };
}

export function startPersonDraft(scene, guestId = null) {
  const person = guestId ? guestFor(scene, guestId) : null;
  scene.ui.personDraft = {
    id: person?.id ?? null,
    name: person?.name ?? "",
    householdId: person?.householdId ?? "",
    newGroupName: "",
    assignedEventIds: person ? scene.eventInvitations.filter((item) => item.guestId === person.id).map((item) => item.eventId) : [],
    delegateForGuestIds: person ? scene.delegations.filter((item) => item.delegateGuestId === person.id && item.state === "active").map((item) => item.delegatorGuestId) : [],
  };
  scene.ui.selectedPersonId = guestId;
  scene.ui.notice = null;
  return scene.ui.personDraft;
}

export function cancelPersonDraft(scene) {
  if (cancelAuthoring(scene, "person")) scene.ui.notice = "Person changes discarded.";
}

function sharedAssignmentError(scene, wantedEventIds) {
  for (const question of scene.attendanceQuestions.filter((item) => item.responseMode === "shared")) {
    const selected = question.eventIds.filter((eventId) => wantedEventIds.has(eventId));
    if (selected.length && selected.length !== question.eventIds.length) return `${question.name} covers ${question.eventIds.map((eventId) => eventFor(scene, eventId).name).join(" and ")}. Assign all covered events together.`;
  }
  return null;
}

function archiveRequest(scene, request) {
  const response = responseFor(scene, request.id);
  const history = scene.responseHistory.filter((entry) => entry.requestId === request.id);
  if (response || history.length) {
    scene.archivedReplyHistory.push({
      id: `archive_${request.id}_${scene.archivedReplyHistory.length + 1}`,
      requestId: request.id,
      guestId: request.guestId,
      questionId: request.questionId,
      coveredEventIds: clone(request.coveredEventIds),
      response: response ? clone(response) : null,
      history: clone(history),
      archivedAt: "2030-05-26T10:00:00-05:00",
      reason: "Attendance-question assignment removed",
    });
  }
  scene.currentResponses = scene.currentResponses.filter((item) => item.requestId !== request.id);
  scene.responseHistory = scene.responseHistory.filter((item) => item.requestId !== request.id);
  scene.attendanceRequests = scene.attendanceRequests.filter((item) => item.id !== request.id);
  clearDraft(scene, request.id);
  if (scene.ui.pendingSave?.requestId === request.id) scene.ui.pendingSave = null;
}

function reconcilePersonRequests(scene, person) {
  const assigned = new Set(scene.eventInvitations.filter((item) => item.guestId === person.id).map((item) => item.eventId));
  for (const question of scene.attendanceQuestions) {
    const shouldExist = question.eventIds.length > 0 && question.eventIds.every((eventId) => assigned.has(eventId));
    const existing = scene.attendanceRequests.find((request) => request.guestId === person.id && request.questionId === question.id);
    if (shouldExist && !existing) {
      const id = uniqueId("req", `${slug(question.name)}_${slug(person.id.replace(/^gst_/, ""))}`, new Set([
        ...scene.attendanceRequests.map((item) => item.id),
        ...scene.archivedReplyHistory.map((item) => item.requestId),
      ]));
      scene.attendanceRequests.push({ id, questionId: question.id, guestId: person.id, coveredEventIds: clone(question.eventIds) });
      scene.currentResponses.push({ requestId: id, answer: "unanswered", saved: false, source: null, savedById: null });
    }
    if (!shouldExist && existing) archiveRequest(scene, existing);
  }
}

export function savePersonDraft(scene) {
  const draft = scene.ui.personDraft;
  if (!draft) return { state: "none" };
  const blocked = authoringGuard(scene, "person", draft.name || "this person");
  if (blocked) return blocked;
  if (!draft.name.trim()) { scene.ui.notice = "Add the person's name before saving."; return { state: "invalid", fields: ["name"] }; }
  const existingEventIds = new Set(draft.id ? scene.eventInvitations.filter((item) => item.guestId === draft.id).map((item) => item.eventId) : []);
  const wantedEvents = new Set(draft.assignedEventIds.filter((eventId) => eventFor(scene, eventId)?.authoring?.readiness === "ready" || existingEventIds.has(eventId)));
  const scopeError = sharedAssignmentError(scene, wantedEvents);
  if (scopeError) { scene.ui.notice = scopeError; return { state: "incompatible", reason: scopeError }; }

  let householdId = draft.householdId || null;
  if (draft.householdId === "new") {
    if (!draft.newGroupName.trim()) { scene.ui.notice = "Name the new group before saving."; return { state: "invalid", fields: ["group"] }; }
    householdId = uniqueId("hh", draft.newGroupName, new Set(scene.households.map((item) => item.id)));
    scene.households.push({ id: householdId, name: draft.newGroupName.trim(), guestIds: [] });
  }
  let person = draft.id ? guestFor(scene, draft.id) : null;
  if (!person) {
    const id = uniqueId("gst", draft.name, new Set(scene.guests.map((item) => item.id)));
    person = { id, name: draft.name.trim(), householdId };
    scene.guests.push(person);
  }
  const oldHousehold = scene.households.find((item) => item.id === person.householdId);
  if (oldHousehold) oldHousehold.guestIds = oldHousehold.guestIds.filter((id) => id !== person.id);
  person.name = draft.name.trim();
  person.householdId = householdId;
  const newHousehold = scene.households.find((item) => item.id === householdId);
  if (newHousehold && !newHousehold.guestIds.includes(person.id)) newHousehold.guestIds.push(person.id);

  for (const invitation of scene.eventInvitations.filter((item) => item.guestId === person.id && !wantedEvents.has(item.eventId))) {
    if (!scene.archivedInvitationIds.includes(invitation.id)) scene.archivedInvitationIds.push(invitation.id);
  }
  scene.eventInvitations = scene.eventInvitations.filter((item) => item.guestId !== person.id || wantedEvents.has(item.eventId));
  const remainingEventIds = new Set(scene.eventInvitations.filter((item) => item.guestId === person.id).map((item) => item.eventId));
  for (const eventId of wantedEvents) if (!remainingEventIds.has(eventId)) {
    const invitationId = uniqueId("inv", `${eventId.replace(/^evt_/, "")}_${person.id.replace(/^gst_/, "")}`, new Set([...scene.eventInvitations.map((item) => item.id), ...scene.archivedInvitationIds]));
    scene.eventInvitations.push({ id: invitationId, eventId, guestId: person.id, eligibility: "eligible" });
  }
  reconcilePersonRequests(scene, person);

  const wantedDelegators = new Set(draft.delegateForGuestIds.filter((id) => id !== person.id));
  for (const delegation of scene.delegations.filter((item) => item.delegateGuestId === person.id && item.state === "active")) {
    if (!wantedDelegators.has(delegation.delegatorGuestId)) {
      delegation.state = "revoked";
      for (const request of scene.attendanceRequests.filter((item) => item.guestId === delegation.delegatorGuestId)) {
        clearDraft(scene, request.id);
        const pending = scene.ui.pendingSave;
        if (pending?.requestId === request.id && pending.role === "guest" && (pending.actorGuestId ?? scene.ui.activeGuestId) === person.id) scene.ui.pendingSave = null;
      }
    }
  }
  const activeDelegators = new Set(scene.delegations.filter((item) => item.delegateGuestId === person.id && item.state === "active").map((item) => item.delegatorGuestId));
  for (const delegatorGuestId of wantedDelegators) if (!activeDelegators.has(delegatorGuestId)) {
    scene.delegations.push({
      id: uniqueId("del", `${person.id}_${delegatorGuestId}`, new Set(scene.delegations.map((item) => item.id))),
      delegatorGuestId,
      delegateGuestId: person.id,
      scope: "eligible attendance questions only",
      state: "active",
    });
  }
  scene.ui.selectedPersonId = person.id;
  scene.ui.personDraft = null;
  scene.ui.notice = `${person.name} saved. Grouping and reply authority remain separate.`;
  return { state: "saved", personId: person.id };
}

export function archivedRepliesFor(scene, guestId) {
  return scene.archivedReplyHistory.filter((item) => item.guestId === guestId);
}

export function startContentDraft(scene, contentId = null) {
  const content = contentId ? scene.contentItems.find((item) => item.id === contentId) : null;
  scene.ui.contentDraft = content ? clone(content) : { id: null, kind: "weekend", title: "", currentBody: "", body: "", location: "", link: "", audienceType: "all", audienceEventId: null, materialChange: false, changedAt: null };
  scene.ui.selectedContentId = contentId;
  scene.ui.notice = null;
  return scene.ui.contentDraft;
}

export function cancelContentDraft(scene) {
  if (cancelAuthoring(scene, "content")) scene.ui.notice = "Content changes discarded.";
}

export function saveContentDraft(scene) {
  const draft = scene.ui.contentDraft;
  if (!draft) return { state: "none" };
  const blocked = authoringGuard(scene, "content", draft.title || "this content item");
  if (blocked) return blocked;
  const missing = [];
  if (!draft.title.trim()) missing.push("title");
  if (!draft.currentBody.trim()) missing.push("current content");
  if (draft.audienceType === "event" && !eventFor(scene, draft.audienceEventId)) missing.push("audience event");
  if (missing.length) { scene.ui.notice = `Add ${missing.join(", ")} before saving.`; return { state: "invalid", missing }; }
  let content = draft.id ? scene.contentItems.find((item) => item.id === draft.id) : null;
  if (!content) {
    const id = uniqueId("content", draft.title, new Set(scene.contentItems.map((item) => item.id)));
    content = { id };
    scene.contentItems.push(content);
  }
  const audienceGuestIds = draft.audienceType === "event"
    ? [...new Set(scene.eventInvitations.filter((item) => item.eventId === draft.audienceEventId).map((item) => item.guestId))]
    : [...new Set(scene.eventInvitations.map((item) => item.guestId))];
  Object.assign(content, clone(draft), { id: content.id, body: draft.currentBody, audienceGuestIds, changedAt: draft.materialChange ? (draft.changedAt ?? "2030-05-26T10:00:00-05:00") : null });
  scene.travelInformation = clone(scene.contentItems);
  scene.ui.selectedContentId = content.id;
  scene.ui.contentDraft = null;
  scene.ui.notice = `${content.title} saved for ${content.audienceType === "event" ? `${eventFor(scene, content.audienceEventId).name} invitees` : "all invited guests"}.`;
  return { state: "saved", contentId: content.id };
}

export function clearContentChange(scene, contentId) {
  const content = scene.contentItems.find((item) => item.id === contentId);
  if (!content) return false;
  startContentDraft(scene, contentId);
  scene.ui.contentDraft.materialChange = false;
  return saveContentDraft(scene);
}

export function contentForGuest(scene, guestId, kind = null) {
  const assignments = scene.eventInvitations.filter((pair) => pair.guestId === guestId);
  return scene.contentItems.filter((item) => {
    const eligible = item.audienceType === "event"
      ? assignments.some((pair) => pair.eventId === item.audienceEventId)
      : item.audienceType === "all" ? assignments.length > 0 : item.audienceGuestIds?.includes(guestId);
    return eligible && (!kind || item.kind === kind);
  });
}

export function enterOrganizerPreview(scene, guestId) {
  if (!guestFor(scene, guestId)) return false;
  scene.ui.previewReturn = {
    role: scene.ui.role,
    organizerSection: scene.ui.organizerSection,
    selectionId: scene.ui.selectionId,
    selectedPersonId: scene.ui.selectedPersonId,
    activeGuestId: scene.ui.activeGuestId,
    notice: scene.ui.notice,
    mobileList: scene.ui.mobileList,
  };
  scene.ui.organizerPreview = true;
  scene.ui.readOnlyPreview = true;
  scene.ui.activeGuestId = guestId;
  scene.ui.role = "guest";
  scene.ui.section = "reply";
  scene.ui.selectionId = guestAttendanceRequests(scene, guestId)[0]?.id ?? null;
  scene.ui.notice = null;
  return true;
}

export function exitOrganizerPreview(scene) {
  const previous = scene.ui.previewReturn;
  if (!previous) return false;
  Object.assign(scene.ui, previous, { organizerPreview: false, readOnlyPreview: false, previewReturn: null });
  return true;
}
