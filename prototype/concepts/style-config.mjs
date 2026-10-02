export const STYLE_KEY = 'wedding-prototype-style-v1';
export const PRESETS = {
  programme: { schemaVersion: 1, presetId: 'programme', colors: { paper: '#f7f1e6', ink: '#17213b', accent: '#1545c6', cover: '#f7f1e6', coverText: '#1545c6' }, nameFont: 'serif', material: 'plain', spacing: 'compact', image: null },
  invitation: { schemaVersion: 1, presetId: 'invitation', colors: { paper: '#f7f3e9', ink: '#22374a', accent: '#365b70', cover: '#365b70', coverText: '#f7f3e9' }, nameFont: 'script', material: 'plain', spacing: 'generous', image: null },
};
export const clone = value => JSON.parse(JSON.stringify(value));
export function contrast(a, b) {
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function validateStyle(config) {
  const errors = [];
  if (config?.schemaVersion !== 1) return ['This style version is not supported.'];
  if (!Object.hasOwn(PRESETS, config.presetId)) errors.push('Choose a supported starting style.');
  for (const field of ['paper', 'ink', 'accent', 'cover', 'coverText']) if (!/^#[0-9a-f]{6}$/i.test(config.colors?.[field] ?? '')) errors.push(`Choose a valid ${field} color.`);
  if (!['serif', 'script'].includes(config.nameFont)) errors.push('Choose a supported name font.');
  if (!['plain', 'image'].includes(config.material)) errors.push('Choose a supported cover treatment.');
  if (!['compact', 'generous'].includes(config.spacing)) errors.push('Choose a supported cover spacing.');
  if (config.image != null && (!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(config.image) || config.image.length > 2800000)) errors.push('Use a PNG, JPEG or WebP image under 2 MB.');
  if (config.material === 'image' && !config.image) errors.push('Choose a cover image or another treatment.');
  if (!errors.some(error => error.includes('color'))) {
    const { ink, paper, accent, coverText, cover } = config.colors;
    if (contrast(ink, paper) < 4.5) errors.push('Text needs more contrast with the page color.');
    if (contrast(accent, paper) < 4.5) errors.push('Links need more contrast with the page color.');
    if (contrast(coverText, cover) < 4.5) errors.push('Names need more contrast with the cover color.');
  }
  return errors;
}
export function normalizeStyle(input) {
  // Preserve unreleased demo drafts from before the simulated-texture option was removed.
  if (input?.schemaVersion === 1 && input.material === "linen") input = { ...input, material: "plain" };
  const errors = validateStyle(input);
  if (errors.length) throw new Error(errors.join(' '));
  return { schemaVersion: 1, presetId: input.presetId, colors: Object.fromEntries(['paper', 'ink', 'accent', 'cover', 'coverText'].map(key => [key, input.colors[key].toLowerCase()])), nameFont: input.nameFont, material: input.material, spacing: input.spacing, image: input.image ?? null };
}
export function freshStore() { return { draft: clone(PRESETS.programme), applied: clone(PRESETS.programme), previous: null, revision: 0 }; }
export function readStore(storage) {
  try { const item = JSON.parse(storage.getItem(STYLE_KEY)); if (!item) return freshStore(); return { draft: normalizeStyle(item.draft), applied: normalizeStyle(item.applied), previous: item.previous ? normalizeStyle(item.previous) : null, revision: Number.isSafeInteger(item.revision) && item.revision >= 0 ? item.revision : 0 }; } catch { return freshStore(); }
}
export function applyDraft(store, draft) { const next = normalizeStyle(draft); return { draft: clone(next), applied: clone(next), previous: clone(store.applied), revision: store.revision + 1 }; }
export function restorePrevious(store) { if (!store.previous) return store; return { draft: clone(store.previous), applied: clone(store.previous), previous: clone(store.applied), revision: store.revision + 1 }; }
export function attemptStyleOperation(store, operation, intended, outcome = 'ready') {
  if (!['apply', 'restore'].includes(operation)) throw new Error('Choose apply or restore.');
  if (!['ready', 'rejected', 'uncertain'].includes(outcome)) throw new Error('Choose a supported operation outcome.');
  const normalized = normalizeStyle(intended);
  if (outcome !== 'ready') {
    return {
      state: outcome,
      operation,
      intended: clone(normalized),
      store: clone(store),
    };
  }
  const next = operation === 'apply'
    ? applyDraft(store, normalized)
    : { draft: clone(normalized), applied: clone(normalized), previous: clone(store.applied), revision: store.revision + 1 };
  return { state: 'saved', operation, intended: clone(normalized), store: next };
}
export function changedFields(before, after) {
  const labels = { paper: 'Page color', ink: 'Text color', accent: 'Links', cover: 'Cover color', coverText: 'Name color' };
  const changes = Object.keys(labels).filter(key => before.colors[key] !== after.colors[key]).map(key => labels[key]);
  for (const [key, label] of [['nameFont', 'Name lettering'], ['material', 'Cover treatment'], ['spacing', 'Cover spacing'], ['image', 'Cover image']]) if (before[key] !== after[key]) changes.push(label);
  return changes;
}
export function applyGuestTheme(root, input) {
  const config = normalizeStyle(input);
  const { paper, ink, accent, cover, coverText } = config.colors;
  for (const [key, value] of Object.entries({ paper, ink, cobalt: accent, muted: ink, 'paper-deep': paper, 'guest-cover': cover, 'guest-cover-text': coverText, 'guest-button-text': contrast(accent, '#ffffff') >= 4.5 ? '#ffffff' : '#000000' })) root.style.setProperty(`--${key}`, value);
  root.dataset.lettering = config.nameFont;
  root.dataset.material = config.material;
  root.dataset.spacing = config.spacing;
  root.style.setProperty('--guest-image', config.material === 'image' ? `url("${config.image}")` : 'none');
  return config;
}
