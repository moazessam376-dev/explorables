// Live training: Karpathy's MLP(3, [4, 4, 1]) on his four examples, with the zero_grad bug as a switch.
safe("train", () => {
  let seed = 3, model = new MLP(3, [4, 4, 1], seed), k = 0, losses = [], last = null, playing = false, M = null;
  const lr = $("#tr-lr"), bug = $("#tr-bug");
  const lrOut = lr.parentElement.querySelector("output");
  const strip = $$("#tr-strip .s");
  const stage = key => strip.forEach(s => s.classList.toggle("on", s.dataset.k === key));
  // ---- charts ----
  const ls = $("#tr-loss"), pr = $("#tr-pred");
  const LL = 40, LR = 312, LT = 14, LB = 170;
  const lyv = v => LB - (Math.log10(clamp(v, 1e-4, 100)) + 4) / 6 * (LB - LT);
  [-4, -3, -2, -1, 0, 1, 2].forEach(e => { S("line", { x1: LL, x2: LR, y1: lyv(10 ** e), y2: lyv(10 ** e), class: "gridl" }, ls); T(ls, LL - 5, lyv(10 ** e) + 3, e === 0 ? "1" : "1e" + e, "tick", "end"); });
  T(ls, LL + 4, LT + 10, "loss (log scale)", "lbl-g");
  const xl = T(ls, LR, LB + 16, "step", "tick", "end");
  const line = S("polyline", { fill: "none", stroke: "var(--grad)", "stroke-width": 2 }, ls);
  const PX = [70, 140, 210, 280], PY = v => 100 - v * 62;
  S("line", { x1: 30, x2: 310, y1: PY(0), y2: PY(0), class: "gridl" }, pr);
  T(pr, 24, PY(1) + 4, "+1", "tick", "end"); T(pr, 24, PY(-1) + 4, "−1", "tick", "end");
  T(pr, 34, 14, "predictions vs targets", "lbl-m");
  const pdots = PX.map((x, i) => {
    S("line", { x1: x - 24, x2: x + 24, y1: PY(YS[i]), y2: PY(YS[i]), stroke: "var(--ink)", "stroke-dasharray": "5 4", "stroke-width": 1.4 }, pr);
    const st = S("line", { x1: x, x2: x, y1: PY(0), stroke: "var(--data)", "stroke-width": 2, opacity: 0.5 }, pr);
    const d = S("circle", { cx: x, r: 7, class: "pt-data" }, pr);
    const t = T(pr, x, 190, "", "lbl-d", "middle");
    return { st, d, t };
  });
  function forward() {
    const ypred = XS.map(x => model.call(x));
    const loss = ypred.reduce((acc, yp, i) => acc.add(yp.sub(YS[i]).pow(2)), new V(0));
    return { ypred, loss };
  }
  function drawCharts(ypred) {
    const n = Math.max(30, losses.length);
    line.setAttribute("points", losses.map((v, i) => `${(LL + (LR - LL) * i / (n - 1)).toFixed(1)},${lyv(v).toFixed(1)}`).join(" "));
    xl.textContent = "step (" + losses.length + ")";
    ypred.forEach((v, i) => {
      const y = PY(clamp(v, -1.4, 1.4));
      pdots[i].d.setAttribute("cy", y); pdots[i].st.setAttribute("y2", y); pdots[i].t.textContent = v.toFixed(2);
    });
  }
  function readout(lossVal, ypred) {
    $("#tr-read").innerHTML =
      `<dt>step</dt><dd>${k}</dd>` +
      `<dt class="c-grad">loss</dt><dd>${lossVal == null ? "—" : py(lossVal)}</dd>` +
      `<dt class="c-data">ypred</dt><dd>[${ypred.map(v => v.toFixed(4)).join(", ")}]   targets [1, -1, -1, 1]</dd>` +
      `<dt>update</dt><dd>for p in n.parameters(): p.data += -${py(+lr.value)} * p.grad${bug.checked ? '   <b class="c-neg">(no zero_grad: grads are piling up)</b>' : ""}</dd>`;
  }
  async function step(slow) {
    if (slow) { stage("fwd"); await sleep(260); }
    const { ypred, loss } = forward();
    if (slow) { stage("loss"); await sleep(260); stage("bwd"); await sleep(260); }
    const params = model.parameters();
    if (!bug.checked) params.forEach(p => { p.grad = 0; });
    loss.backward();
    if (slow) { stage("upd"); await sleep(200); }
    params.forEach(p => { p.data += -(+lr.value) * p.grad; });
    k++; losses.push(loss.data); last = loss.data;
    const yv = ypred.map(v => v.data);
    drawCharts(yv); readout(loss.data, yv);
    if (M) { M.weights(); M.setActs(model.trace(XS[0])); }
    if (slow) { await sleep(200); stage(null); }
  }
  function reset() {
    playing = false; $("#tr-play").textContent = "▶ Train";
    seed += 1; model = new MLP(3, [4, 4, 1], seed); k = 0; losses = []; last = null;
    const { ypred, loss } = forward();
    const yv = ypred.map(v => v.data);
    drawCharts(yv); readout(loss.data, yv);
    if (M) { M.model = model; M.weights(); M.setActs(model.trace(XS[0])); }
  }
  let busy = false;
  $("#tr-step").addEventListener("click", async () => { if (busy || playing) return; busy = true; await step(true); busy = false; });
  $("#tr-play").addEventListener("click", () => {
    if (busy) return;
    playing = !playing;
    $("#tr-play").textContent = playing ? "■ Pause" : "▶ Train";
    if (!playing) return;
    let t0 = 0;
    const loop = now => {
      if (!playing) return;
      if (now - t0 > (RM ? 0 : 90)) {
        t0 = now; step(false);
        if (k >= 400 || (last != null && last < 1e-4)) { playing = false; $("#tr-play").textContent = "▶ Train"; return; }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  $("#tr-reset").addEventListener("click", () => { if (!busy) reset(); });
  lr.addEventListener("input", () => { lrOut.textContent = py(+lr.value); readout(last, forward().ypred.map(v => v.data)); });
  bug.addEventListener("change", () => readout(last, forward().ypred.map(v => v.data)));
  lrOut.textContent = py(+lr.value);
  const host = $("#tr3d");
  whenNear(host, () => { M = mlp3D(host, model, {}); if (M) M.setActs(model.trace(XS[0])); });
  seed -= 1; reset();
});

// Parameter counts on a log scale (2:14:03)
safe("scale", () => {
  const svg = $("#sc-svg");
  const D = [["micrograd demo", 41, "--data"], ["3Blue1Brown digits", 13002, "--ok"], ["GPT-2 small", 124e6, "--grad"], ["GPT-3", 175e9, "--nudge"]];
  const L = 150, R = 620, xv = v => L + Math.log10(v) / 12 * (R - L);
  for (let e = 0; e <= 12; e += 3) {
    S("line", { x1: xv(10 ** e), x2: xv(10 ** e), y1: 14, y2: 196, class: "gridl" }, svg);
    T(svg, xv(10 ** e), 214, ["1", "1,000", "1 million", "1 billion", "1 trillion"][e / 3], "tick", "middle");
  }
  D.forEach(([name, v, c], i) => {
    const y = 26 + i * 44;
    T(svg, L - 10, y + 16, name, "lbl", "end");
    S("rect", { x: L, y, width: xv(v) - L, height: 24, rx: 4, fill: `var(${c})`, opacity: 0.85 }, svg);
    const txt = v >= 1e9 ? (v / 1e9) + " billion" : v >= 1e6 ? (v / 1e6) + " million" : v.toLocaleString("en-US");
    if (xv(v) > 480) { const t = T(svg, xv(v) - 8, y + 16, txt, "lbl", "end"); t.style.fill = "var(--panel)"; t.style.fontWeight = "700"; }
    else T(svg, xv(v) + 6, y + 16, txt, "lbl", "start");
  });
});
