import { STYLE_KEY, PRESETS, clone, validateStyle, normalizeStyle, readStore, attemptStyleOperation, changedFields } from './style-config.mjs';
const $ = selector => document.querySelector(selector);
let store = readStore(localStorage);
let draft = clone(store.draft);
let pendingOperation = null;
const preview = $('#guest-preview');
const feedback = message => { $('#feedback').textContent = message; };
const matches = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function persist(next) {
  try { localStorage.setItem(STYLE_KEY, JSON.stringify(next)); store = next; return true; }
  catch { feedback('This browser could not save the style. The applied style is unchanged and your intended style remains here for retry.'); return false; }
}
function sendPreview() {
  if (validateStyle(draft).length) return;
  preview.contentWindow?.postMessage({ type: 'wedding-style-preview', style: normalizeStyle(draft), section: $('#preview-page').value }, location.origin);
}
function reflectControls() {
  document.querySelectorAll('[name=preset]').forEach(input => { input.checked = input.value === draft.presetId; });
  document.querySelectorAll('[data-color]').forEach(input => { input.value = draft.colors[input.dataset.color]; });
  $('#name-font').value = draft.nameFont;
  $('#material').value = draft.material;
  $('#spacing').value = draft.spacing;
}
function refreshRecovery() {
  const recovery = $('#operation-recovery');
  recovery.hidden = !pendingOperation;
  if (!pendingOperation) return;
  const verb = pendingOperation.operation === 'apply' ? 'apply the draft style' : 'restore the previous style';
  $('#operation-scope').textContent = `${pendingOperation.state === 'uncertain' ? 'Not confirmed' : 'Not applied'}: ${verb}. The currently applied style is unchanged.`;
  $('#retry-style').hidden = pendingOperation.state === 'uncertain';
  $('#check-style').hidden = pendingOperation.state !== 'uncertain';
  $('#dismiss-style').disabled = pendingOperation.state === 'uncertain';
}
function refresh() {
  const errors = validateStyle(draft);
  $('#contrast-status').textContent = errors.length ? errors.join(' ') : 'Text and cover colors pass the contrast check.';
  $('#contrast-status').dataset.error = errors.length > 0;
  $('#draft-status').textContent = matches(draft, store.draft) ? 'Draft saved' : 'Unsaved changes';
  $('#preview-status').textContent = errors.length ? 'Showing last valid style · fix colors to preview' : matches(draft, store.applied) ? `Applied style · version ${store.revision}` : 'Draft · not applied';
  $('#discard-style').disabled = matches(draft, store.draft) || pendingOperation?.state === 'uncertain';
  $('#save-draft').disabled = errors.length > 0 || matches(draft, store.draft);
  $('#review-changes').disabled = errors.length > 0 || changedFields(store.applied, draft).length === 0 || pendingOperation?.state === 'uncertain';
  $('#restore-style').disabled = !store.previous || pendingOperation?.state === 'uncertain';
  $('#image-controls').hidden = draft.material !== 'image';
  refreshRecovery();
  sendPreview();
}
function edited() { $('#apply-review').hidden = true; feedback(''); refresh(); }
function runOperation(operation, intended, outcome = $('#style-state').value) {
  const result = attemptStyleOperation(store, operation, intended, outcome);
  if (result.state === 'saved') {
    if (!persist(result.store)) {
      pendingOperation = { state: 'rejected', operation, intended: clone(result.intended) };
      refresh();
      return false;
    }
    pendingOperation = null;
    draft = clone(store.draft);
    reflectControls();
    $('#apply-review').hidden = true;
    feedback(operation === 'apply' ? 'Style applied to the demo guest site in this browser. Invitations and replies are unchanged.' : 'Previous style restored in this browser. Invitations and replies are unchanged.');
    refresh();
    return true;
  }
  pendingOperation = { state: result.state, operation, intended: clone(result.intended) };
  feedback(result.state === 'uncertain'
    ? `Could not confirm whether the style was ${operation === 'apply' ? 'applied' : 'restored'}. The previously applied style remains current until you check.`
    : `The style was not ${operation === 'apply' ? 'applied' : 'restored'}. The previously applied style remains current and the intended change is retained.`);
  refresh();
  return false;
}

$('#style-form').addEventListener('submit', event => event.preventDefault());
$('#style-form').addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'preset') { draft = clone(PRESETS[input.value]); reflectControls(); }
  if (input.dataset.color) draft.colors[input.dataset.color] = input.value;
  if (input.id === 'name-font') draft.nameFont = input.value;
  if (input.id === 'material') draft.material = input.value;
  if (input.id === 'spacing') draft.spacing = input.value;
  if (input.id !== 'cover-image') edited();
});
$('#save-draft').addEventListener('click', () => {
  if (validateStyle(draft).length) return;
  if (persist({ ...store, draft: normalizeStyle(draft) })) feedback('Draft saved in this browser. The applied guest site has not changed.');
  refresh();
});
$('#discard-style').addEventListener('click', () => {
  if (pendingOperation?.state === 'uncertain') return;
  draft = clone(store.draft); pendingOperation = null; $('#cover-image').value = '';
  reflectControls(); edited(); feedback('Unsaved style edits discarded. Your saved draft and applied style are unchanged.');
});
$('#review-changes').addEventListener('click', () => {
  const errors = validateStyle(draft); if (errors.length || pendingOperation?.state === 'uncertain') return;
  $('#change-summary').textContent = `Changes: ${changedFields(store.applied, draft).join(', ')}.`;
  $('#apply-review').hidden = false;
  $('#apply-style').focus();
});
$('#cancel-review').addEventListener('click', () => { $('#apply-review').hidden = true; $('#review-changes').focus(); });
$('#apply-style').addEventListener('click', () => { if (!validateStyle(draft).length) runOperation('apply', draft); });
$('#restore-style').addEventListener('click', () => { if (store.previous) runOperation('restore', store.previous); });
$('#retry-style').addEventListener('click', () => { if (pendingOperation) runOperation(pendingOperation.operation, pendingOperation.intended, 'ready'); });
$('#check-style').addEventListener('click', () => {
  if (!pendingOperation || pendingOperation.state !== 'uncertain') return;
  pendingOperation = { ...pendingOperation, state: 'rejected' };
  feedback('Checked the applied style. The previous style is still current; the intended change is retained for retry.');
  refresh();
});
$('#dismiss-style').addEventListener('click', () => { if (pendingOperation?.state === 'uncertain') return; pendingOperation = null; feedback('The applied style is unchanged. Your draft remains available.'); refresh(); });
$('#style-state').addEventListener('change', () => { feedback(`Review state changed to ${$('#style-state').selectedOptions[0].text}. Draft and applied style are unchanged.`); refresh(); });
$('#reset-style').addEventListener('click', () => { draft = clone(PRESETS[draft.presetId]); reflectControls(); edited(); feedback('Draft reset to its starting style. Review changes to apply it.'); });
$('#cover-image').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { feedback('Choose a PNG, JPEG or WebP under 2 MB.'); event.target.value = ''; return; }
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = new Image(); image.src = data; await image.decode();
    if (image.width > 10000 || image.height > 10000) throw new Error('oversize');
    draft.image = data; draft.material = 'image'; reflectControls(); edited(); feedback('Image added to the draft. It stays in this browser.');
  } catch { feedback('That image could not be read. Choose another PNG, JPEG or WebP.'); event.target.value = ''; }
});
$('#remove-image').addEventListener('click', () => { draft.image = null; draft.material = 'plain'; $('#cover-image').value = ''; reflectControls(); edited(); });
for (const device of ['phone', 'desktop']) $(`#${device}`).addEventListener('click', () => {
  $('.preview-stage').classList.toggle('desktop', device === 'desktop');
  $('#phone').setAttribute('aria-pressed', device === 'phone'); $('#desktop').setAttribute('aria-pressed', device === 'desktop');
});
$('#preview-case').addEventListener('change', () => { preview.src = `combined.html?role=guest&scenario=${encodeURIComponent($('#preview-case').value)}&preview=true`; });
$('#preview-page').addEventListener('change', sendPreview);
preview.addEventListener('load', sendPreview);
window.addEventListener('message', event => { if (event.origin === location.origin && event.source === preview.contentWindow && event.data?.type === 'wedding-preview-ready') sendPreview(); });
window.addEventListener('beforeunload', event => { if (!matches(draft, store.draft)) { event.preventDefault(); event.returnValue = ''; } });
reflectControls(); refresh();
