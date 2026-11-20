// VICE COVER — the cover engine: draws a multi-panel GTA-poster-style cover
// onto any 2D canvas at any size. Pure canvas, no network, no fonts to load:
// lettering is system "Arial Black" / Impact with a hand-drawn outline and
// gradient fill. Panels, grades and the title band are all data below, so the
// editor and the PNG exporter share exactly one drawing path.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    photoFilter: 'saturate(1.35) contrast(1.08)',
    tintTop: 'rgba(255, 110, 60, 0.10)',
    tintBottom: 'rgba(255, 40, 120, 0.30)',
    titleStops: ['#ffe259', '#ff7a3c', '#ff2e88'],
    bandTop: '#2a0a2e',
    bandBottom: '#12041a',
    accent: '#ff7a3c',
    subtitle: '#ffd9a0',
  },
  neon: {
    label: 'Neon',
    photoFilter: 'saturate(1.55) contrast(1.12) hue-rotate(-8deg)',
    tintTop: 'rgba(0, 229, 255, 0.14)',
    tintBottom: 'rgba(255, 0, 160, 0.32)',
    titleStops: ['#7df9ff', '#b967ff', '#ff2fb3'],
    bandTop: '#0d0218',
    bandBottom: '#160a2e',
    accent: '#00e5ff',
    subtitle: '#7df9ff',
  },
  noir: {
    label: 'Noir',
    photoFilter: 'grayscale(1) contrast(1.18) brightness(1.06)',
    tintTop: 'rgba(255, 255, 255, 0.04)',
    tintBottom: 'rgba(0, 0, 0, 0.38)',
    titleStops: ['#ffffff', '#d8d8d8'],
    bandTop: '#161616',
    bandBottom: '#000000',
    accent: '#f2f2f2',
    subtitle: '#d8d8d8',
  },
  miami: {
    label: 'Miami',
    photoFilter: 'saturate(1.3) contrast(1.06)',
    tintTop: 'rgba(0, 220, 190, 0.13)',
    tintBottom: 'rgba(255, 80, 160, 0.26)',
    titleStops: ['#a8ffce', '#2affd5', '#ff7ad9'],
    bandTop: '#03231f',
    bandBottom: '#0a0f2a',
    accent: '#2affd5',
    subtitle: '#a8ffce',
  },
};

export const LAYOUTS = {
  // Panel rects as fractions [x, y, w, h] of the panel area above the title band.
  hero3: {
    label: 'Hero + 2',
    panels: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  grid4: {
    label: 'Grid 2 x 2',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  strip: {
    label: 'Hero + strip',
    panels: [
      [0, 0, 1, 0.62],
      [0, 0.62, 1 / 3, 0.38],
      [1 / 3, 0.62, 1 / 3, 0.38],
      [2 / 3, 0.62, 1 / 3, 0.38],
    ],
  },
};

export const PANEL_NAMES = ['Hero', 'Panel 1', 'Panel 2', 'Panel 3'];

/** A fresh cover state: hero photo on the big panel, the other samples below. */
export function defaultState() {
  const panel = (photo) => ({ photo, zoom: 1, ox: 0, oy: 0 });
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'Neon nights on the boulevard',
    panels: [panel(null), panel(null), panel(null), panel(null)],
  };
}

/** Deterministic speckled grain: same seed, same dots, every run and export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grainPattern() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  const rand = mulberry32(20261121);
  const img = g.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() > 0.5 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  g.putImageData(img, 0, 0);
  return c;
}

let grain = null;

/** Draws one photo into a panel rect: cover-fit, zoomed, shifted by ox/oy. */
export function drawPanelPhoto(ctx, photo, rect, panel, filter) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#3b1d4d');
    sky.addColorStop(1, '#12041a');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const dw = iw * base;
  const dh = ih * base;
  const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
  const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
  ctx.filter = filter || 'none';
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** The retro sun: a gradient disc with slits cut across its lower half. */
export function drawRetroSun(ctx, cx, cy, r, bandTop, bandBottom, stops) {
  ctx.save();
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  const colors = stops || ['#ffe259', '#ff7a3c', '#ff2e88'];
  colors.forEach((c, i) => sun.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = bandBottom;
  let bar = cy + r * 0.05;
  let thick = r * 0.09;
  while (bar < cy + r) {
    ctx.fillRect(cx - r, bar, r * 2, thick);
    bar += thick + r * 0.16;
    thick *= 1.35;
  }
  ctx.restore();
}

/** Bold outlined title + subtitle inside the title band. */
export function drawTitleBand(ctx, w, h, bandY, bandH, grade, title, subtitle) {
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, grade.bandTop);
  band.addColorStop(1, grade.bandBottom);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, bandY, w, Math.max(3, bandH * 0.035));

  const pad = w * 0.045;
  const text = (title || 'UNTITLED').trim().toUpperCase();
  let size = bandH * 0.52;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
    try { ctx.letterSpacing = '2px'; } catch { /* older canvas: no letter spacing */ }
  };
  setFont(size);
  const maxW = w * 0.66;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    setFont(size);
  }
  const grad = ctx.createLinearGradient(0, bandY + bandH * 0.18, 0, bandY + bandH * 0.82);
  grade.titleStops.forEach((c, i) => grad.addColorStop(i / (grade.titleStops.length - 1), c));
  ctx.save();
  ctx.translate(pad, bandY + bandH * 0.44);
  ctx.rotate(-0.012);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14041c';
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(10, bandH * 0.17);
    ctx.font = `italic 700 ${subSize}px "Arial Black", Impact, sans-serif`;
    try { ctx.letterSpacing = '3px'; } catch { /* ignore */ }
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(sub.toUpperCase(), pad, bandY + bandH * 0.82);
    ctx.shadowBlur = 0;
  }
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }

  const sunR = bandH * 0.34;
  if (w > 700) {
    const sunStops = grade === GRADES.noir ? ['#f2f2f2', '#b0b0b0', '#5a5a5a'] : undefined;
    drawRetroSun(ctx, w - pad - sunR * 0.9, bandY + bandH * 0.52, sunR, grade.bandTop, grade.bandBottom, sunStops);
  }
}

/** Draws the whole cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  const bandH = Math.round(h * 0.19);
  const panelH = h - bandH;
  const g = Math.max(4, Math.round(w * 0.006));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#14041c';
  ctx.fillRect(0, 0, w, panelH);

  layout.panels.forEach((frac, i) => {
    const rect = {
      x: frac[0] * w + g / 2,
      y: frac[1] * panelH + g / 2,
      w: frac[2] * w - g,
      h: frac[3] * panelH - g,
    };
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    drawPanelPhoto(ctx, panel.photo, rect, panel, grade.photoFilter);
    const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    tint.addColorStop(0, grade.tintTop);
    tint.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = Math.max(1, g * 0.4);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  drawTitleBand(ctx, w, h, panelH, bandH, grade, state.title, state.subtitle);

  const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  if (!grain) grain = grainPattern();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(grain, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Panel rects in preview-canvas pixels, for click-to-select hit testing. */
export function panelRects(canvas, state) {
  const w = canvas.width;
  const h = canvas.height;
  const bandH = Math.round(h * 0.19);
  const panelH = h - bandH;
  const g = Math.max(4, Math.round(w * 0.006));
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  return layout.panels.map((frac) => ({
    x: frac[0] * w,
    y: frac[1] * panelH,
    w: frac[2] * w,
    h: frac[3] * panelH,
    _g: g,
  }));
}
