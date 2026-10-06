// Compare the retained-layer renderer with the original one, then benchmark it.
// Playwright run_code body (a function of `page`). Point BASE at a dev server of the
// checkout being measured; the original runs used a local port.
async (page) => {
  const BASE = 'http://localhost:5173';
  await page.goto(`${BASE}/simulations`);
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(async () => {
    const { TrafficEngine } = await import('/src/components/TrafficSimulator/model/engine.ts');
    const { findScenario } = await import('/src/components/TrafficSimulator/model/scenarios.ts');
    const renderer = await import('/src/components/TrafficSimulator/renderer.ts');
    const orig = await import('/src/components/TrafficSimulator/zz-renderer-orig.ts');
    window.__cmp = { TrafficEngine, findScenario, renderer, orig };
  });
  const compare = (id, params, width, dpr, theme) => page.evaluate(({ id, params, width, dpr, theme }) => {
    const { TrafficEngine, findScenario, renderer, orig } = window.__cmp;
    const sc = findScenario(id);
    const engine = new TrafficEngine(sc, { ...sc.defaults, ...params });
    for (let i = 0; i < 3000; i++) engine.step();
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(width * dpr); c.height = Math.round(renderer.SPACE_TIME_HEIGHT * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
    const [a, actx] = mk(), [b, bctx] = mk();
    const dots = new renderer.SpaceTimeDots();
    // warm the retained layer, then advance incrementally to exercise scrolling
    renderer.drawSpaceTime(bctx, engine, width, theme, dots);
    for (let k = 0; k < 37; k++) { for (let i = 0; i < 5; i++) engine.step(); bctx.setTransform(dpr, 0, 0, dpr, 0, 0); renderer.drawSpaceTime(bctx, engine, width, theme, dots); }
    orig.drawSpaceTime(actx, engine, width, theme);
    const da = actx.getImageData(0, 0, a.width, a.height).data, db = bctx.getImageData(0, 0, b.width, b.height).data;
    let differing = 0, big = 0;
    for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i+1] - db[i+1]) + Math.abs(da[i+2] - db[i+2]); if (d > 0) differing++; if (d > 120) big++; }
    const total = da.length / 4;
    window.__last = { a: a.toDataURL(), b: b.toDataURL() };
    return { pixels: total, differingPct: +(100 * differing / total).toFixed(2), stronglyDifferingPct: +(100 * big / total).toFixed(2) };
  }, { id, params, width, dpr, theme });
  const out = {};
  out.ringDark775 = await compare('ring', {}, 775, 1, 'dark');
  out.corridorLight775 = await compare('corridor', {}, 775, 1, 'light');
  out.bottleneckDark330x2 = await compare('bottleneck', {}, 330, 2, 'dark');
  const imgs = await page.evaluate(() => window.__last);
  await page.setContent(`<body style="background:#222;margin:0"><img src="${imgs.a}" style="display:block;width:660px"><img src="${imgs.b}" style="display:block;width:660px;margin-top:8px"></body>`);
  await page.screenshot({ path: 'st-compare-bottleneck.png', fullPage: true });
  // incremental cost under throttling
  await page.goto(`${BASE}/simulations`);
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { TrafficEngine } = await import('/src/components/TrafficSimulator/model/engine.ts');
    const { findScenario } = await import('/src/components/TrafficSimulator/model/scenarios.ts');
    const renderer = await import('/src/components/TrafficSimulator/renderer.ts');
    window.__b = { TrafficEngine, findScenario, renderer };
  });
  const bench = (id, params, width, dpr, frames) => page.evaluate(({ id, params, width, dpr, frames }) => {
    const { TrafficEngine, findScenario, renderer } = window.__b;
    const sc = findScenario(id);
    const engine = new TrafficEngine(sc, { ...sc.defaults, ...params });
    for (let i = 0; i < 6000; i++) engine.step();
    const c = document.createElement('canvas'); c.width = Math.round(width * dpr); c.height = Math.round(renderer.SPACE_TIME_HEIGHT * dpr); document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dots = new renderer.SpaceTimeDots();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let t0 = performance.now();
    renderer.drawSpaceTime(ctx, engine, width, 'dark', dots); ctx.getImageData(0, 0, 1, 1);
    const full = performance.now() - t0;
    let drawTime = 0;
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < 5; i++) engine.step();
      t0 = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.drawSpaceTime(ctx, engine, width, 'dark', dots); ctx.getImageData(0, 0, 1, 1);
      drawTime += performance.now() - t0;
    }
    c.remove();
    return { vehicles: engine.vehicles.length, fullRepaintMs: +full.toFixed(1), perNewSampleMs: +(drawTime / frames).toFixed(2) };
  }, { id, params, width, dpr, frames });
  for (const rate of [1, 4, 6]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    out[`cpu${rate}x bottleneckMax desktop`] = await bench('bottleneck', { demand: 5400 }, 775, 1, 40);
    out[`cpu${rate}x bottleneckMax mobile`] = await bench('bottleneck', { demand: 5400 }, 330, 2, 40);
    out[`cpu${rate}x bottleneckDefault mobile`] = await bench('bottleneck', {}, 330, 2, 40);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return out;
}
