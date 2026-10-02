const clone = (value) => structuredClone(value);

export const ANSWERS = ["accepted", "declined", "unanswered"];
export const RESPONSE_MODES = ["separate", "shared", "none"];

export function invitationFor(scene, invitationId) {
  return scene.eventInvitations.find((invitation) => invitation.id === invitationId);
}

export function guestFor(scene, guestId) {
  return scene.guests.find((guest) => guest.id === guestId);
}

export function eventFor(scene, eventId) {
  return scene.events.find((event) => event.id === eventId);
}

export function questionFor(scene, questionId) {
  return scene.attendanceQuestions.find((question) => question.id === questionId);
}

export function attendanceRequestFor(scene, requestOrInvitationId) {
  const direct = scene.attendanceRequests.find((request) => request.id === requestOrInvitationId);
  if (direct) return direct;
  const invitation = invitationFor(scene, requestOrInvitationId);
  if (!invitation) return undefined;
  return requestForGuestEvent(scene, invitation.guestId, invitation.eventId);
}

export function responseFor(scene, requestOrInvitationId) {
  const request = attendanceRequestFor(scene, requestOrInvitationId);
  return request ? scene.currentResponses.find((response) => response.requestId === request.id) : undefined;
}

export function requestForGuestEvent(scene, guestId, eventId) {
  return scene.attendanceRequests.find((request) => request.guestId === guestId && request.coveredEventIds.includes(eventId));
}

export function representedGuestIds(scene, activeGuestId) {
  const delegated = scene.delegations
    .filter((delegation) => delegation.delegateGuestId === activeGuestId && delegation.state === "active")
    .map((delegation) => delegation.delegatorGuestId);
  return [activeGuestId, ...delegated];
}

export function guestInvitations(scene, activeGuestId) {
  const represented = new Set(representedGuestIds(scene, activeGuestId));
  return scene.eventInvitations.filter((invitation) => represented.has(invitation.guestId));
}

export function guestAttendanceRequests(scene, activeGuestId) {
  const represented = new Set(representedGuestIds(scene, activeGuestId));
  return scene.attendanceRequests.filter((request) => represented.has(request.guestId));
}

function normalizedRequests(scene, records) {
  const requests = (records ?? scene.attendanceRequests)
    .map((record) => record?.questionId ? record : attendanceRequestFor(scene, record?.id))
    .filter(Boolean);
  return [...new Map(requests.map((request) => [request.id, request])).values()];
}

export function deriveTotals(scene, records = scene.attendanceRequests) {
  return normalizedRequests(scene, records).reduce(
    (totals, request) => {
      const answer = responseFor(scene, request.id)?.answer ?? "unanswered";
      totals.eligible += 1;
      totals[answer] += 1;
      return totals;
    },
    { eligible: 0, accepted: 0, declined: 0, unanswered: 0 },
  );
}

export function completionFor(scene, records) {
  const totals = deriveTotals(scene, records);
  if (!totals.eligible) return "empty";
  if (totals.unanswered === totals.eligible) return "all-unanswered";
  if (totals.unanswered) return "partial";
  return "complete";
}

export function invitedPeopleForEvent(scene, eventId) {
  return scene.eventInvitations
    .filter((invitation) => invitation.eventId === eventId)
    .map((invitation) => {
      const request = requestForGuestEvent(scene, invitation.guestId, eventId);
      return {
        invitation,
        request,
        guest: guestFor(scene, invitation.guestId),
        response: request ? responseFor(scene, request.id) : null,
      };
    });
}

function ensureResponse(scene, requestId, answer = "unanswered") {
  let response = responseFor(scene, requestId);
  if (!response) {
    response = { requestId, answer, saved: answer !== "unanswered", source: null, savedById: null };
    scene.currentResponses.push(response);
  }
  return response;
}

function setResponse(scene, requestId, answer, savedById = null, source = null) {
  const response = ensureResponse(scene, requestId);
  Object.assign(response, {
    requestId,
    answer,
    saved: answer !== "unanswered",
    source: answer === "unanswered" ? null : source,
    savedById: answer === "unanswered" ? null : savedById,
  });
}

function applyScenarioSetup(scene, scenarioId) {
  if (scenarioId === "S2") {
    for (const id of ["req_wedding_eleanor", "req_wedding_mateo", "req_wedding_lucia"]) setResponse(scene, id, "unanswered");
  }
  if (scenarioId === "S4") {
    setResponse(scene, "req_wedding_priya", "accepted", "gst_priya", "guest");
    scene.responseHistory = scene.responseHistory.filter((entry) => entry.id === "hist_priya_wedding_initial");
  }
}

const ACTIVE_GUEST = {
  S1: "gst_amina",
  S2: "gst_eleanor",
  S3: "gst_mateo",
  S4: "gst_priya",
  S5: "gst_amina",
  S6: "gst_benjamin",
};

const STARTING_SELECTION = {
  S1: "req_rehearsal_dinner_amina",
  S2: "req_wedding_eleanor",
  S3: "req_welcome_mateo",
  S4: "req_wedding_priya",
  S5: "req_rehearsal_dinner_amina",
  S6: "req_brunch_benjamin",
};

export function buildScene(fixture, scenarioId = "S1", viewState = "ready") {
  const scene = clone(fixture);
  applyScenarioSetup(scene, scenarioId);
  if (viewState === "empty") {
    for (const key of ["events", "attendanceQuestions", "locations", "travelInformation", "households", "guests", "delegations", "eventInvitations", "attendanceRequests", "currentResponses", "responseHistory", "saveAttempts", "eventChanges", "accessStates"]) scene[key] = [];
  }
  scene.ui = {
    scenarioId,
    role: ["S4", "S5"].includes(scenarioId) ? "organizer" : "guest",
    viewState,
    activeGuestId: ACTIVE_GUEST[scenarioId],
    selectionId: STARTING_SELECTION[scenarioId],
    section: scenarioId === "S6" ? "recovery" : "reply",
    previousSection: null,
    draftAnswer: null,
    notice: null,
    historyOpen: false,
    hasFailedOnce: false,
    recovered: false,
  };
  return scene;
}

export function applyScenarioAction(scene) {
  const { scenarioId } = scene.ui;
  if (scenarioId === "S1") {
    scene.ui.notice = "Amina's rehearsal is on her schedule with no reply needed. Theodore's invitation starts at the private rehearsal dinner.";
    return;
  }
  if (scenarioId === "S2") {
    for (const id of ["req_wedding_eleanor", "req_wedding_mateo", "req_wedding_lucia"]) {
      const request = attendanceRequestFor(scene, id);
      setResponse(scene, id, "accepted", "gst_eleanor", request.guestId === "gst_eleanor" ? "guest" : "delegate");
    }
    scene.ui.notice = "Three wedding answers were saved. Each answer covers the ceremony and reception together.";
    return;
  }
  if (scenarioId === "S3") {
    scene.ui.notice = "Mateo's Saturday arrival guidance is current. His welcome-drinks decline and wedding attendance remain unchanged.";
    return;
  }
  if (scenarioId === "S4") {
    const result = saveAnswer(scene, "req_wedding_priya", "declined", "organizer_phone_report");
    if (result.state === "saved") scene.ui.notice = "Priya's wedding answer changed to not attending. Ceremony and reception totals changed together.";
    return;
  }
  if (scenarioId === "S5") {
    saveAnswer(scene, "inv_rehearsal_amina", "accepted", "organizer_correction");
    return;
  }
  if (scenarioId === "S6") {
    scene.ui.recovered = true;
    scene.ui.selectionId = "req_brunch_benjamin";
    scene.ui.section = "weekend";
    scene.ui.notice = "Current invitation opened. Benjamin's saved replies are unchanged; brunch is still unanswered.";
  }
}

export function prepareScene(fixture, scenarioId = "S1", viewState = "ready") {
  return buildScene(fixture, scenarioId, viewState);
}

export function saveAnswer(scene, requestOrInvitationId, answer, source) {
  const request = attendanceRequestFor(scene, requestOrInvitationId);
  if (!request) {
    const invitation = invitationFor(scene, requestOrInvitationId);
    const event = invitation ? eventFor(scene, invitation.eventId) : null;
    scene.ui.notice = event?.responseMode === "none"
      ? `${event.name} does not collect attendance replies. No saved record changed.`
      : "That attendance question is not available. No saved record changed.";
    return { state: "blocked", currentAnswerAfter: "unanswered" };
  }
  const question = questionFor(scene, request.questionId);
  if (!question || request.coveredEventIds.some((eventId) => eventFor(scene, eventId)?.responseMode === "none")) {
    scene.ui.notice = "This schedule item does not collect attendance replies. No saved record changed.";
    return { state: "blocked", currentAnswerAfter: responseFor(scene, request.id)?.answer ?? "unanswered" };
  }
  if (scene.ui.readOnlyPreview || scene.ui.organizerPreview) {
    return { state: "blocked", currentAnswerAfter: responseFor(scene, request.id)?.answer ?? "unanswered" };
  }
  const blocked = (message) => {
    scene.ui.notice = message;
    return { state: "blocked", currentAnswerAfter: responseFor(scene, request.id)?.answer ?? "unanswered" };
  };
  const organizer = scene.ui.role === "organizer";
  const organizerSource = source?.startsWith("organizer_");
  if ((!organizer && (organizerSource || !representedGuestIds(scene, scene.ui.activeGuestId).includes(request.guestId)))
      || (organizer && !organizerSource)) return blocked("This reply is outside your permission. No saved answer changed.");
  const validScope = guestFor(scene, request.guestId)
    && sameMembers(request.coveredEventIds, question.eventIds)
    && request.coveredEventIds.length > 0
    && request.coveredEventIds.every((eventId) => eventFor(scene, eventId)?.attendanceQuestionId === question.id
      && scene.eventInvitations.some((invitation) => invitation.eventId === eventId && invitation.guestId === request.guestId)
      && questionScopeCompatible(scene, question.id, eventId));
  if (!validScope) return blocked("The covered events or invitations changed. Check the current invitation before replying.");
  if (scene.ui.viewState === "stale" || scene.ui.pendingSave?.state === "uncertain" || scene.ui.authoringAttempt?.state === "uncertain")
    return blocked("Check the current saved records before making another change.");
  if (!ANSWERS.includes(answer)) throw new Error(`Invalid answer: ${answer}`);
  if (answer === "unanswered") return blocked("Choose attending or not attending. An unanswered reply cannot replace a saved answer.");
  const current = ensureResponse(scene, request.id);
  const before = current.answer;
  const actorId = source?.startsWith("organizer_") ? "org_mara" : scene.ui.activeGuestId;

  if (scene.ui.viewState === "save-error" && !scene.ui.hasFailedOnce) {
    scene.ui.hasFailedOnce = true;
    scene.ui.notice = `Could not save ${answer}. The saved answer is still ${before}.`;
    return { state: "failed", savedAnswerBefore: before, currentAnswerAfter: before };
  }
  if (scene.ui.viewState === "uncertain") {
    scene.ui.notice = `We could not confirm ${answer}. The saved answer is still ${before} until you check again.`;
    return { state: "uncertain", savedAnswerBefore: before, currentAnswerAfter: before };
  }

  setResponse(scene, request.id, answer, actorId, source);
  if (before !== answer) {
    scene.responseHistory.push({
      id: `local_${request.id}_${scene.responseHistory.length + 1}`,
      requestId: request.id,
      answer,
      actorId,
      source,
      recordedAt: "2030-05-26T10:00:00-05:00",
      supersededById: null,
    });
  }
  const sourceLabel = source === "organizer_phone_report" ? "Organizer correction from a phone report" : source === "delegate" ? "Reply contact" : "Guest reply";
  scene.ui.notice = `${sourceLabel} saved: ${answer}.`;
  scene.ui.draftAnswer = null;
  return { state: "saved", savedAnswerBefore: before, currentAnswerAfter: answer };
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

export function questionScopeCompatible(scene, questionId, candidateEventId) {
  const question = questionFor(scene, questionId);
  if (!question) return false;
  const candidate = scene.eventInvitations.filter((item) => item.eventId === candidateEventId).map((item) => item.guestId);
  return question.eventIds.every((eventId) => eventId === candidateEventId || sameMembers(
    candidate,
    scene.eventInvitations.filter((item) => item.eventId === eventId).map((item) => item.guestId),
  ));
}

export function sceneInvariantReport(scene) {
  const invitationIds = new Set(scene.eventInvitations.map((invitation) => invitation.id));
  const requestIds = new Set(scene.attendanceRequests.map((request) => request.id));
  const validAnswers = scene.currentResponses.every((response) => ANSWERS.includes(response.answer));
  const noOrphanResponses = scene.currentResponses.every((response) => requestIds.has(response.requestId));
  const noDuplicateRequests = requestIds.size === scene.attendanceRequests.length
    && new Set(scene.attendanceRequests.map((request) => `${request.guestId}:${request.questionId}`)).size === scene.attendanceRequests.length;
  const validRequestScopes = scene.attendanceRequests.every((request) => {
    const question = questionFor(scene, request.questionId);
    return question
      && sameMembers(request.coveredEventIds, question.eventIds)
      && request.coveredEventIds.every((eventId) => scene.eventInvitations.some((invitation) => invitation.eventId === eventId && invitation.guestId === request.guestId));
  });
  const noReplyEventsHaveNoRequests = scene.events.filter((event) => event.responseMode === "none")
    .every((event) => !scene.attendanceRequests.some((request) => request.coveredEventIds.includes(event.id)));
  const sharedScopesCompatible = scene.attendanceQuestions.filter((question) => question.responseMode === "shared")
    .every((question) => question.eventIds.every((eventId) => questionScopeCompatible(scene, question.id, eventId)));
  const totals = deriveTotals(scene);
  const reconciles = totals.eligible === totals.accepted + totals.declined + totals.unanswered;
  return { invitationIds, validAnswers, noOrphanResponses, noDuplicateRequests, validRequestScopes, noReplyEventsHaveNoRequests, sharedScopesCompatible, reconciles, totals };
}
