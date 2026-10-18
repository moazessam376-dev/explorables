// The loss as squares you can resize, and the parameter counter.
safe("loss", () => {
  const svg = $("#ls-svg");
  const HIS = [0.92, 0.89, 0.80, 0.81];
  const pred = HIS.slice();
  const CX = [62, 232, 402, 572], Y0 = 150, SC = 58;
  const yv = v => Y0 - v * SC, vy = y => (Y0 - y) / SC;
  S("line", { x1: 20, x2: 730, y1: Y0, y2: Y0, class: "gridl" }, svg);
  [1, -1].forEach(v => T(svg, 14, yv(v) + 4, (v > 0 ? "+" : "") + v, "tick", "start"));
  const cols = CX.map((x, i) => {
    S("line", { x1: x - 36, x2: x + 36, y1: yv(YS[i]), y2: yv(YS[i]), stroke: "var(--ink)", "stroke-dasharray": "5 4", "stroke-width": 1.4 }, svg);
    T(svg, x, 292, `x = [${XS[i].join(", ")}]`, "lbl-m", "middle");
    const sq = S("rect", { fill: "var(--grad-soft)", stroke: "var(--grad)", "stroke-width": 1.4 }, svg);
    const stem = S("line", { x1: x, x2: x, stroke: "var(--data)", "stroke-width": 1.5, opacity: 0.5 }, svg);
    const dot = S("circle", { cx: x, r: 9, class: "pt-data draggable" }, svg);
    const tt = T(svg, x, 274, "", "lbl-g", "middle");
    const pv = T(svg, x - 14, 0, "", "lbl-d", "end");
    dot.style.touchAction = "none";
    let drag = false;
    dot.addEventListener("pointerdown", e => { drag = true; dot.setPointerCapture(e.pointerId); e.preventDefault(); });
    dot.addEventListener("pointermove", e => {
      if (!drag) return;
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      pred[i] = clamp(Math.round(vy(p.matrixTransform(svg.getScreenCTM().inverse()).y) * 100) / 100, -1.4, 1.4);
      draw();
    });
    dot.addEventListener("pointerup", () => { drag = false; });
    dot.addEventListener("pointercancel", () => { drag = false; });
    return { x, sq, stem, dot, tt, pv };
  });
  function draw() {
    let total = 0;
    const terms = [];
    cols.forEach((c, i) => {
      const err = pred[i] - YS[i], side = Math.abs(err) * SC;
      total += err * err;
      terms.push(`(${pred[i].toFixed(2)} − (${YS[i]}))² = ${(err * err).toFixed(3)}`);
      c.dot.setAttribute("cy", yv(pred[i]));
      c.stem.setAttribute("y1", yv(0)); c.stem.setAttribute("y2", yv(pred[i]));
      c.sq.setAttribute("x", c.x + 14); c.sq.setAttribute("y", Math.min(yv(pred[i]), yv(YS[i])));
      c.sq.setAttribute("width", side); c.sq.setAttribute("height", side);
      c.tt.textContent = `error² = ${(err * err).toFixed(3)}`;
      c.pv.textContent = pred[i].toFixed(2); c.pv.setAttribute("y", yv(pred[i]) + 4);
    });
    $("#ls-read").innerHTML = terms.map((t, i) => `<dt>example ${i + 1}</dt><dd>${t}</dd>`).join("") +
      `<dt class="c-grad">loss</dt><dd><b>${total.toFixed(4)}</b>   ${total < 1e-6 ? "perfect: every prediction is on its target" : "(sum of the four squares)"}</dd>`;
  }
  $("#ls-his").addEventListener("click", () => { HIS.forEach((v, i) => { pred[i] = v; }); draw(); });
  $("#ls-perfect").addEventListener("click", () => { YS.forEach((v, i) => { pred[i] = v; }); draw(); });
  draw();
});

safe("params", () => {
  const ids = ["in", "l1", "l2", "l3"];
  const sl = Object.fromEntries(ids.map(k => [k, $("#pc-" + k)]));
  const outEl = k => sl[k].parentElement.querySelector("output");
  const svg = $("#pc-svg");
  function draw() {
    ids.forEach(k => { outEl(k).textContent = sl[k].value; });
    const sz = ids.map(k => +sl[k].value);
    const per = [1, 2, 3].map(l => ({ n: sz[l], nin: sz[l - 1], p: sz[l] * (sz[l - 1] + 1) }));
    const total = per.reduce((s, x) => s + x.p, 0);
    svg.innerHTML = "";
    const COL = ["var(--data)", "var(--grad)", "var(--ok)"];
    T(svg, 10, 16, "each slice = one neuron: its weights plus its bias", "lbl-m", "start");
    let x = 10;
    const scale = Math.min(6, 600 / total);
    per.forEach((L, i) => {
      const w = Math.max(L.p * scale, 3);
      S("rect", { x, y: 26, width: w, height: 40, rx: 4, fill: COL[i], opacity: 0.85 }, svg);
      for (let k = 1; k < L.n; k++) S("line", { x1: x + w * k / L.n, x2: x + w * k / L.n, y1: 26, y2: 66, stroke: "var(--panel)", "stroke-width": 1.5 }, svg);
      S("rect", { x: 10, y: 84 + 20 * i, width: 12, height: 12, rx: 3, fill: COL[i] }, svg);
      T(svg, 30, 94 + 20 * i, `${i === 2 ? "output layer" : "layer " + (i + 1)}: ${L.n} neuron${L.n > 1 ? "s" : ""} × (${L.nin} weights + 1 bias) = ${L.p}`, "lbl", "start");
      x += w + 6;
    });
    const desc = `MLP(${sz[0]}, [${sz.slice(1).join(", ")}])`;
    $("#pc-read").innerHTML =
      `<dt>network</dt><dd><code>${desc}</code></dd>` +
      `<dt class="c-data">parameters</dt><dd><b>${total}</b>${total === 41 ? "   ← Karpathy's network" : ""}</dd>` +
      `<dt>for scale</dt><dd>3Blue1Brown's digit net: 13,002 · GPT-2 small: 124,000,000</dd>`;
  }
  ids.forEach(k => sl[k].addEventListener("input", draw));
  draw();
});
