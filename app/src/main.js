// VICE COVER — wires the editor: photo upload (file input + drag & drop),
// per-panel crop and position, layouts, colour grades, captions, PNG export.
// `?shot=` sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelRects, defaultState, GRADES, LAYOUTS, PANEL_NAMES } from './cover.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 x 1080' },
  { w: 1080, h: 1350, label: '1080 x 1350' },
  { w: 1920, h: 1080, label: '1920 x 1080' },
];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let selectedPanel = 0;
let currentSize = EXPORT_SIZES[0];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  canvas.width = currentSize.w;
  canvas.height = currentSize.h;
  drawCover(canvas, state);
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-panel]').forEach((b) => b.classList.toggle('active', Number(b.dataset.panel) === selectedPanel));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', Number(b.dataset.size) === currentSize.w * 10000 + currentSize.h));
  document.getElementById('panelName').textContent = PANEL_NAMES[selectedPanel] || 'Panel';
  const p = state.panels[selectedPanel];
  document.getElementById('zoom').value = p.zoom;
  document.getElementById('zoomVal').textContent = `${p.zoom.toFixed(2)}x`;
  document.getElementById('ox').value = p.ox;
  document.getElementById('oy').value = p.oy;
}

function say(msg) {
  status.textContent = msg;
}

/** Puts an image into a panel (and redraws). */
export function setPanelPhoto(index, img) {
  state.panels[index].photo = img;
  redraw();
}

/** Reads a File as an image and puts it in the selected panel. */
export async function loadFileIntoPanel(file, index) {
  if (!file || !file.type.startsWith('image/')) {
    say('That was not an image file.');
    return false;
  }
  const img = await loadImage(URL.createObjectURL(file));
  setPanelPhoto(index, img);
  say(`Photo loaded into ${PANEL_NAMES[index]}.`);
  return true;
}

/** Renders the cover at w x h and downloads it as a PNG. */
export async function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-cover-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  window.__lastExport = { w, h, bytes: blob.size };
  say(`Saved vice-cover-${w}x${h}.png (${Math.round(blob.size / 1024)} KB).`);
  return blob;
}

document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadFileIntoPanel(file, selectedPanel);
  e.target.value = '';
});

const dropZone = document.getElementById('preview');
['dragenter', 'dragover'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.add('dropping');
}));
['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.remove('dropping');
}));
dropZone.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) await loadFileIntoPanel(file, selectedPanel);
});

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const rects = panelRects(canvas, state);
  const hit = rects.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  if (hit >= 0) {
    selectedPanel = hit;
    redraw();
    say(`Selected ${PANEL_NAMES[hit]} — crop it below.`);
  }
});

document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
  const img = await loadImage(`samples/${b.dataset.sample}.jpg`);
  setPanelPhoto(selectedPanel, img);
  say(`Sample ${b.dataset.sample}.jpg loaded into ${PANEL_NAMES[selectedPanel]}.`);
}));

document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => {
  selectedPanel = Number(b.dataset.panel);
  redraw();
}));

document.getElementById('fillAll').addEventListener('click', () => {
  const photo = state.panels[selectedPanel].photo;
  if (!photo) { say('Load a photo into this panel first.'); return; }
  state.panels.forEach((p) => { p.photo = photo; });
  redraw();
  say('Same photo in every panel.');
});

document.getElementById('clearPanel').addEventListener('click', () => {
  state.panels[selectedPanel] = { photo: null, zoom: 1, ox: 0, oy: 0 };
  redraw();
  say(`${PANEL_NAMES[selectedPanel]} cleared.`);
});

document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('ox').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('oy').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});

document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  selectedPanel = 0;
  redraw();
  say(`Layout: ${LAYOUTS[state.layout].label}.`);
}));

document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
  state.grade = b.dataset.grade;
  redraw();
  say(`Grade: ${GRADES[state.grade].label}.`);
}));

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});

document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', async () => {
  const size = EXPORT_SIZES.find((s) => s.w * 10000 + s.h === Number(b.dataset.size));
  if (!size) return;
  currentSize = size;
  redraw();
  await exportPNG(size.w, size.h);
}));

// Test hook: the verification run drives the app through this, never the DOM.
window.__viceCover = { state, redraw, exportPNG, loadFileIntoPanel, setPanelPhoto, get selectedPanel() { return selectedPanel; } };

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (scene) => {
    if (scene.size) currentSize = scene.size;
    if (scene.layout) state.layout = scene.layout;
    if (scene.grade) state.grade = scene.grade;
    if (scene.title !== undefined) {
      state.title = scene.title;
      document.getElementById('title').value = scene.title;
    }
    if (scene.subtitle !== undefined) {
      state.subtitle = scene.subtitle;
      document.getElementById('subtitle').value = scene.subtitle;
    }
    for (let i = 0; i < scene.photos.length; i += 1) {
      if (scene.photos[i]) state.panels[i].photo = await loadImage(`samples/${scene.photos[i]}.jpg`);
    }
    redraw();
  });
} else {
  Promise.all([
    loadImage('samples/sample.jpg'),
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
  ]).then(([hero, b, p]) => {
    state.panels[0].photo = hero;
    state.panels[1].photo = b;
    state.panels[2].photo = p;
    state.panels[3].photo = hero;
    redraw();
  }).catch(() => redraw());
  redraw();
}
