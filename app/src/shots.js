// Fixed scenes for screenshots: ?shot=editor shows the page with photos loaded;
// ?shot=cover shows the cover alone, at the export size named by `size`
// (1080x1080, 1080x1350 or 1920x1080). `photos` picks the samples, one per
// panel, `grade` / `layout` / `title` / `subtitle` style the scene.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photos') || query.get('photo') || 'sample').split(',');
  const sizeParam = (query.get('size') || '1080x1080').split('x');
  await load({
    photos,
    layout: query.get('layout') || undefined,
    grade: query.get('grade') || undefined,
    title: query.get('title') ?? undefined,
    subtitle: query.get('subtitle') ?? undefined,
    size: { w: Number(sizeParam[0]) || 1080, h: Number(sizeParam[1]) || 1080 },
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
