// Benchmark drawSpaceTime in the dev build under CPU throttling.
// Playwright run_code body (a function of `page`). Point BASE at a dev server of the
// checkout being measured; the original runs used a local port.
async (page) => {
  const BASE = 'http://localhost:5173';
  await page.goto(`${BASE}/simulations`);
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  const prepare = () => page.evaluate(async () => {
    const { TrafficEngine } = await import('/src/components/TrafficSimulator/model/engine.ts');
    const { findScenario } = await import('/src/components/TrafficSimulator/model/scenarios.ts');
    const renderer = await import('/src/components/TrafficSimulator/renderer.ts');
    const configs = {
      corridorDefault: ['corridor', {}],
      bottleneckDefault: ['bottleneck', {}],
      bottleneckMax: ['bottleneck', { demand: 5400 }],
    };
    window.__bench = { renderer, engines: {} };
    for (const [name, [id, params]] of Object.entries(configs)) {
      const sc = findScenario(id);
      const e = new TrafficEngine(sc, { ...sc.defaults, ...params });
      for (let i = 0; i < 6000; i++) e.step();
      window.__bench.engines[name] = e;
    }
    return Object.fromEntries(Object.entries(window.__bench.engines).map(([k, e]) => [k, { vehicles: e.vehicles.length, samples: e.samples.length, points: e.samples.reduce((n, s) => n + s.x.length, 0) }]));
  });
  const measure = (width, dpr, reps) => page.evaluate(({ width, dpr, reps }) => {
    const { renderer, engines } = window.__bench;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(renderer.SPACE_TIME_HEIGHT * dpr);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const out = {};
    for (const [name, engine] of Object.entries(engines)) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.drawSpaceTime(ctx, engine, width, 'dark');
      ctx.getImageData(0, 0, 1, 1); // flush
      const t0 = performance.now();
      for (let i = 0; i < reps; i++) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); renderer.drawSpaceTime(ctx, engine, width, 'dark'); }
      ctx.getImageData(0, 0, 1, 1);
      out[name] = +((performance.now() - t0) / reps).toFixed(2);
    }
    canvas.remove();
    return out;
  }, { width, dpr, reps });
  const result = { sizes: await prepare() };
  for (const rate of [1, 4, 6]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    result[`cpu${rate}x desktop 775@1x`] = await measure(775, 1, rate === 1 ? 30 : 10);
    result[`cpu${rate}x mobile 330@2x`] = await measure(330, 2, rate === 1 ? 30 : 10);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return result;
}
