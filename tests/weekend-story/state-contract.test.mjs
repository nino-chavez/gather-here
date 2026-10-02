import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  answerFor,
  attendanceRequestFor,
  checkUncertain,
  createCombinedScene,
  deriveTotals,
  enterOrganizerPreview,
  eventFor,
  guestAttendanceRequests,
  guestInvitations,
  guestSave,
  invitedPeopleForEvent,
  organizerSave,
  questionFor,
  reconcileStale,
  responseFor,
  retryPendingSave,
  runScenarioAction,
  saveEventDraft,
  savePersonDraft,
  setDraft,
  setSimulationState,
  startEventDraft,
  startPersonDraft,
} from "../../prototype/concepts/combined-state.mjs";
import { saveAnswer, sceneInvariantReport } from "../../prototype/concepts/state.mjs";

const fixtureUrl = new URL("../../prototype/concepts/data/concept-data.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

{
  assert.equal(fixture.events.length, 6);
  assert.deepEqual(questionFor(fixture, "q_wedding").eventIds, ["evt_ceremony", "evt_dinner"]);
  assert.equal(fixture.eventInvitations.filter((item) => item.eventId === "evt_rehearsal").map((item) => item.guestId).join(), "gst_amina");
  assert.deepEqual(fixture.eventInvitations.filter((item) => item.eventId === "evt_rehearsal_dinner").map((item) => item.guestId), ["gst_amina", "gst_theodore"]);
  assert.equal(fixture.attendanceRequests.length, 26);
  assert.deepEqual(fixture.expectedSummaries.overall, { guests: 8, households: 2, scheduleEvents: 6, attendanceQuestions: 4, uniqueReplyRequests: 26, accepted: 17, declined: 4, unanswered: 5 });
}

{
  const scene = createCombinedScene(fixture, "S1");
  for (const expected of fixture.expectedSummaries.byEvent) {
    const records = invitedPeopleForEvent(scene, expected.eventId);
    assert.equal(records.length, expected.invited ?? expected.eligible, `${expected.eventId} invited people`);
    if (expected.replyRequired === false) {
      assert.equal(records.every((record) => record.request === undefined), true, `${expected.eventId} stays schedule only`);
      continue;
    }
    assert.deepEqual(
      deriveTotals(scene, records.map((record) => record.request)),
      { eligible: expected.eligible, accepted: expected.accepted, declined: expected.declined, unanswered: expected.unanswered },
      `${expected.eventId} totals`,
    );
  }
  assert.equal(new Set(scene.attendanceRequests.map((request) => `${request.guestId}:${request.questionId}`)).size, 26);
}

{
  const scene = createCombinedScene(fixture, "S1");
  const before = JSON.stringify([scene.currentResponses, scene.responseHistory]);
  assert.equal(saveAnswer(scene, "inv_rehearsal_amina", "accepted", "guest").state, "blocked");
  assert.match(scene.ui.notice, /does not collect attendance replies/i);
  assert.equal(JSON.stringify([scene.currentResponses, scene.responseHistory]), before);
  assert.equal(invitedPeopleForEvent(scene, "evt_rehearsal")[0].request, undefined);
  assert.deepEqual(deriveTotals(scene), { eligible: 26, accepted: 17, declined: 4, unanswered: 5 });
}

{
  const scene = createCombinedScene(fixture, "S4");
  scene.ui.role = "organizer";
  const ceremonyBefore = deriveTotals(scene, invitedPeopleForEvent(scene, "evt_ceremony").map((record) => record.request));
  const receptionBefore = deriveTotals(scene, invitedPeopleForEvent(scene, "evt_dinner").map((record) => record.request));
  const responseCount = scene.currentResponses.length;
  assert.equal(organizerSave(scene, "req_wedding_priya", "declined", "phone_report").state, "saved");
  assert.equal(scene.currentResponses.length, responseCount, "linked save changes one person-question record");
  assert.equal(responseFor(scene, "req_wedding_priya").answer, "declined");
  assert.equal(responseFor(scene, "inv_ceremony_priya").answer, "declined");
  assert.equal(responseFor(scene, "inv_dinner_priya").answer, "declined");
  const ceremonyAfter = deriveTotals(scene, invitedPeopleForEvent(scene, "evt_ceremony").map((record) => record.request));
  const receptionAfter = deriveTotals(scene, invitedPeopleForEvent(scene, "evt_dinner").map((record) => record.request));
  assert.deepEqual(ceremonyAfter, receptionAfter);
  assert.equal(ceremonyAfter.accepted, ceremonyBefore.accepted - 1);
  assert.equal(ceremonyAfter.declined, ceremonyBefore.declined + 1);
  assert.deepEqual(ceremonyBefore, receptionBefore);
  assert.equal(scene.responseHistory.filter((entry) => entry.requestId === "req_wedding_priya").at(-1).source, "organizer_phone_report");
}

{
  const scene = createCombinedScene(fixture, "S1", "save-error");
  setDraft(scene, "req_wedding_amina", "declined");
  assert.equal(guestSave(scene, "req_wedding_amina", answerFor(scene, "req_wedding_amina")).state, "failed");
  assert.equal(responseFor(scene, "req_wedding_amina").answer, "accepted");
  assert.equal(responseFor(scene, "inv_dinner_amina").answer, "accepted");
  assert.equal(retryPendingSave(scene).state, "saved");
  assert.equal(responseFor(scene, "inv_ceremony_amina").answer, "declined");
  assert.equal(responseFor(scene, "inv_dinner_amina").answer, "declined");
}

{
  const scene = createCombinedScene(fixture, "S6", "uncertain");
  setDraft(scene, "req_brunch_benjamin", "accepted");
  assert.equal(guestSave(scene, "req_brunch_benjamin", "accepted").state, "uncertain");
  assert.equal(responseFor(scene, "req_brunch_benjamin").answer, "unanswered");
  assert.equal(guestSave(scene, "req_brunch_benjamin", "accepted").state, "blocked");
  assert.equal(checkUncertain(scene).state, "checked");
  assert.equal(responseFor(scene, "req_brunch_benjamin").answer, "unanswered");
  assert.equal(answerFor(scene, "req_brunch_benjamin"), "accepted");
}

{
  const scene = createCombinedScene(fixture, "S2", "uncertain");
  setDraft(scene, "req_wedding_eleanor", "accepted");
  assert.equal(guestSave(scene, "req_wedding_eleanor", "accepted").state, "uncertain");
  assert.equal(responseFor(scene, "inv_ceremony_eleanor").answer, "unanswered");
  assert.equal(responseFor(scene, "inv_dinner_eleanor").answer, "unanswered");
  assert.equal(checkUncertain(scene).state, "checked");
  assert.equal(responseFor(scene, "inv_ceremony_eleanor").answer, "unanswered");
  assert.equal(responseFor(scene, "inv_dinner_eleanor").answer, "unanswered");
}

{
  const scene = createCombinedScene(fixture, "S2");
  setDraft(scene, "req_wedding_eleanor", "accepted");
  setSimulationState(scene, "stale");
  assert.equal(guestSave(scene, "req_wedding_eleanor", "accepted").state, "blocked");
  assert.equal(responseFor(scene, "inv_ceremony_eleanor").answer, "unanswered");
  assert.equal(responseFor(scene, "inv_dinner_eleanor").answer, "unanswered");
  reconcileStale(scene);
  assert.equal(guestSave(scene, "req_wedding_eleanor", "accepted").state, "saved");
  assert.equal(responseFor(scene, "inv_ceremony_eleanor").answer, "accepted");
  assert.equal(responseFor(scene, "inv_dinner_eleanor").answer, "accepted");
}

{
  const scene = createCombinedScene(fixture, "S2");
  const before = JSON.stringify([scene.currentResponses, scene.responseHistory]);
  enterOrganizerPreview(scene, "gst_eleanor");
  assert.equal(saveAnswer(scene, "req_wedding_eleanor", "accepted", "guest").state, "blocked");
  assert.equal(JSON.stringify([scene.currentResponses, scene.responseHistory]), before);
}

{
  const scene = createCombinedScene(fixture, "S2", "save-error");
  scene.ui.role = "guest";
  setDraft(scene, "req_wedding_mateo", "declined");
  assert.equal(guestSave(scene, "req_wedding_mateo", "declined").state, "failed");
  scene.ui.role = "organizer";
  setSimulationState(scene, "ready");
  const draft = startPersonDraft(scene, "gst_eleanor");
  draft.delegateForGuestIds = [];
  assert.equal(savePersonDraft(scene).state, "saved");
  assert.equal(scene.ui.pendingSave, null);
  assert.equal(scene.ui.drafts.req_wedding_mateo, undefined);
  assert.equal(retryPendingSave(scene).state, "none");
}

{
  const scene = createCombinedScene(fixture, "S1");
  const first = startEventDraft(scene);
  Object.assign(first, { name: "Fictional picnic A", date: "2030-06-16", startTime: "14:00", timezone: "America/Chicago", locationToFollow: true });
  const firstSave = saveEventDraft(scene, true);
  assert.equal(firstSave.state, "ready");
  const firstEvent = eventFor(scene, firstSave.eventId);
  assert.equal(firstEvent.responseMode, "separate", "new events default to separate questions");

  const second = startEventDraft(scene);
  Object.assign(second, { name: "Fictional picnic B", date: "2030-06-16", startTime: "15:00", timezone: "America/Chicago", locationToFollow: true, responseMode: "shared", attendanceQuestionId: firstEvent.attendanceQuestionId });
  const secondSave = saveEventDraft(scene, true);
  assert.equal(secondSave.state, "ready", "empty compatible scopes may share a question");
  assert.equal(questionFor(scene, firstEvent.attendanceQuestionId).eventIds.length, 2);

  const incomplete = startPersonDraft(scene, "gst_noor");
  incomplete.assignedEventIds.push(firstSave.eventId);
  assert.equal(savePersonDraft(scene).state, "incompatible", "a shared question cannot leak across mismatched invitation scopes");
  scene.ui.personDraft.assignedEventIds.push(secondSave.eventId);
  assert.equal(savePersonDraft(scene).state, "saved");
  const sharedRequest = scene.attendanceRequests.find((request) => request.guestId === "gst_noor" && request.questionId === firstEvent.attendanceQuestionId);
  assert.deepEqual(sharedRequest.coveredEventIds, [firstSave.eventId, secondSave.eventId]);
}

{
  const scene = createCombinedScene(fixture, "S5");
  const rehearsal = startEventDraft(scene, "evt_rehearsal");
  rehearsal.responseMode = "separate";
  rehearsal.attendanceQuestionId = null;
  const before = JSON.stringify([scene.events, scene.attendanceQuestions, scene.attendanceRequests, scene.currentResponses]);
  assert.equal(saveEventDraft(scene, true).state, "guarded");
  assert.match(scene.ui.notice, /while invitations or replies exist/i);
  assert.equal(JSON.stringify([scene.events, scene.attendanceQuestions, scene.attendanceRequests, scene.currentResponses]), before);
}

{
  const scene = createCombinedScene(fixture, "S2");
  assert.equal(guestAttendanceRequests(scene, "gst_eleanor").length, 9, "three people have three attendance questions each");
  assert.equal(guestInvitations(scene, "gst_eleanor").length, 12, "three people keep four schedule rows each while wedding replies stay shared");
  runScenarioAction(scene);
  for (const requestId of ["req_wedding_eleanor", "req_wedding_mateo", "req_wedding_lucia"]) assert.equal(responseFor(scene, requestId).answer, "accepted");
  const fresh = createCombinedScene(fixture, "S2");
  for (const requestId of ["req_wedding_eleanor", "req_wedding_mateo", "req_wedding_lucia"]) assert.equal(responseFor(fresh, requestId).answer, "unanswered");
}

for (const scenarioId of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
  const scene = createCombinedScene(fixture, scenarioId);
  const report = sceneInvariantReport(scene);
  for (const key of ["validAnswers", "noOrphanResponses", "noDuplicateRequests", "validRequestScopes", "noReplyEventsHaveNoRequests", "sharedScopesCompatible", "reconciles"]) assert.equal(report[key], true, `${scenarioId} ${key}`);
}

assert.equal(attendanceRequestFor(createCombinedScene(fixture, "S1"), "inv_rehearsal_amina"), undefined);

console.log("weekend-story state: shared saves, recovery states, preview, authority loss, schedule-only guards, response configuration, scopes, totals, and resets passed");
