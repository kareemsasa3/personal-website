// Whole-page cost of the original artifact and the derivative, under 4x CPU throttling.
// Playwright run_code body. Point the two URLs at production previews of each build;
// the original runs used local ports.
async (page) => {
  const out = {};
  for (const [name, base] of [['original-7420cc7', 'http://localhost:4301'], ['derivative', 'http://localhost:4320']]) {
    const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await p.goto(`${base}/simulations/traffic-simulator`);
    await p.getByRole('heading', { name: 'Traffic Simulator', level: 1 }).waitFor();
    await p.getByLabel('Scenario').selectOption({ label: 'Lane drop' });
    const d = p.getByRole('slider', { name: 'Arrival demand' }); await d.focus(); await p.keyboard.press('End');
    await p.getByLabel('Playback').selectOption({ label: '16× real time' });
    await p.waitForTimeout(4000);
    await p.locator('.traffic-spacetime').scrollIntoViewIfNeeded();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.waitForTimeout(2000);
    const sim = async () => { const t = await p.getByLabel('Elapsed simulated time').textContent(); const [m, s] = t.split(':').map(Number); return m * 60 + s; };
    const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    await p.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const a = await m(), s0 = await sim(), t0 = Date.now(), f0 = await p.evaluate(() => window.__frames);
    await p.waitForTimeout(15000);
    const b = await m(), s1 = await sim(), t1 = Date.now(), f1 = await p.evaluate(() => window.__frames);
    const wall = (t1 - t0) / 1000;
    out[name] = {
      simSecondsPerWallSecond: +((s1 - s0) / wall).toFixed(1),
      framesPerSecond: +((f1 - f0) / wall).toFixed(1),
      mainThreadBusyPct: +(100 * (b.TaskDuration - a.TaskDuration) / wall).toFixed(0),
      scriptPct: +(100 * (b.ScriptDuration - a.ScriptDuration) / wall).toFixed(0),
      limitedNotice: await p.getByText(/Step budget reached|can.t keep up/).count(),
      vehicles: await p.locator('[aria-label="Live measurements"] dd').nth(2).textContent(),
      errors,
    };
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
  }
  return out;
}
