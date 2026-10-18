// Backprop through a neuron: live diagram, tanh curve, 3D output surface, and Karpathy's graph.
safe("neuron", () => {
  const K = { x1: 2, x2: 0, w1: -3, w2: 1, b: NEURON_B };
  const st = Object.assign({}, K);
  const keys = ["x1", "w1", "x2", "w2", "b"];
  const sl = Object.fromEntries(keys.map(k => [k, $("#nr-" + k)]));
  const outEl = k => sl[k].parentElement.querySelector("output");
  const subs = [];
  function calc() {
    const n = st.x1 * st.w1 + st.x2 * st.w2 + st.b, o = Math.tanh(n), dn = 1 - o * o;
    return { n, o, dn, db: dn, dx1: st.w1 * dn, dw1: st.x1 * dn, dx2: st.w2 * dn, dw2: st.x2 * dn };
  }
  const fmt = v => f2(v);
  // ---- diagram ----
  const dg = $("#nr-diag");
  const mk = marker(dg, "nr-mk");
  const P = { x1: [40, 70], x2: [40, 205], s: [205, 138], t: [292, 138], o: [380, 138] };
  const wl1 = S("line", { x1: P.x1[0] + 22, y1: P.x1[1], x2: P.s[0] - 26, y2: P.s[1] - 8, "stroke-linecap": "round" }, dg);
  const wl2 = S("line", { x1: P.x2[0] + 22, y1: P.x2[1], x2: P.s[0] - 26, y2: P.s[1] + 8, "stroke-linecap": "round" }, dg);
  S("line", { x1: P.s[0], y1: 36, x2: P.s[0], y2: P.s[1] - 28, class: "edge", "marker-end": mk }, dg);
  S("line", { x1: P.s[0] + 27, y1: P.s[1], x2: P.t[0] - 26, y2: P.t[1], class: "edge", "marker-end": mk }, dg);
  S("line", { x1: P.t[0] + 26, y1: P.t[1], x2: P.o[0] - 25, y2: P.o[1], class: "edge", "marker-end": mk }, dg);
  const circ = (p, r) => S("circle", { cx: p[0], cy: p[1], r, fill: "var(--panel)", stroke: "var(--ink)", "stroke-width": 1.3 }, dg);
  circ(P.x1, 21); circ(P.x2, 21); circ(P.s, 26); circ(P.o, 24);
  S("rect", { x: P.t[0] - 25, y: P.t[1] - 17, width: 50, height: 34, rx: 6, fill: "var(--panel)", stroke: "var(--ink)", "stroke-width": 1.3 }, dg);
  T(dg, P.t[0], P.t[1] + 4, "tanh", "lbl", "middle");
  T(dg, P.s[0], P.s[1] + 5, "Σ", "lbl", "middle").style.fontSize = "18px";
  const txt = {};
  const put = (id, x, y, cls, anchor) => { txt[id] = T(dg, x, y, "", cls, anchor || "middle"); };
  put("x1", P.x1[0], P.x1[1] + 4, "lbl-d"); put("x2", P.x2[0], P.x2[1] + 4, "lbl-d");
  put("x1n", P.x1[0], P.x1[1] - 28, "lbl-m"); put("x2n", P.x2[0], P.x2[1] - 28, "lbl-m");
  put("gx1", P.x1[0], P.x1[1] + 38, "lbl-g"); put("gx2", P.x2[0], P.x2[1] + 38, "lbl-g");
  put("w1", 130, 64, "lbl"); put("gw1", 130, 78, "lbl-g");
  put("w2", 130, 194, "lbl"); put("gw2", 130, 208, "lbl-g");
  put("b", P.s[0], 18, "lbl"); put("gb", P.s[0], 31, "lbl-g");
  put("n", P.s[0], P.s[1] + 44, "lbl-d"); put("gn", P.s[0], P.s[1] + 58, "lbl-g");
  put("o", P.o[0], P.o[1] + 4, "lbl-d"); put("on", P.o[0], P.o[1] - 30, "lbl-m"); put("go", P.o[0], P.o[1] + 40, "lbl-g");
  put("loc", P.t[0], P.t[1] + 40, "lbl-g");
  txt.on.textContent = "o"; txt.x1n.textContent = "x₁"; txt.x2n.textContent = "x₂";
  function weightStyle(line, w) {
    line.setAttribute("stroke", w >= 0 ? "var(--ok)" : "var(--neg)");
    line.setAttribute("stroke-width", (1 + Math.abs(w) * 1.6).toFixed(2));
  }
  // ---- tanh plot ----
  const tp = $("#nr-tanh");
  const L = 34, R = 290, Tt = 14, B = 236, N0 = -4, N1 = 4;
  const tx = n => L + (n - N0) / (N1 - N0) * (R - L), ty = o => B - (o + 1.2) / 2.4 * (B - Tt);
  [-4, -2, 0, 2, 4].forEach(n => { S("line", { x1: tx(n), x2: tx(n), y1: Tt, y2: B, class: "gridl" }, tp); T(tp, tx(n), B + 14, String(n), "tick", "middle"); });
  [-1, 0, 1].forEach(o => { S("line", { x1: L, x2: R, y1: ty(o), y2: ty(o), class: "gridl" }, tp); T(tp, L - 5, ty(o) + 3, String(o), "tick", "end"); });
  let d = ""; for (let i = 0; i <= 120; i++) { const n = N0 + (N1 - N0) * i / 120; d += (i ? "L" : "M") + tx(n).toFixed(1) + "," + ty(Math.tanh(n)).toFixed(1); }
  S("path", { d, class: "curve" }, tp);
  T(tp, R, B + 28, "n", "tick", "end"); T(tp, L + 4, Tt + 10, "o = tanh(n)", "lbl");
  const tan = S("line", { class: "sl-grad" }, tp), dot = S("circle", { r: 6, class: "pt-data" }, tp);
  const tlab = T(tp, R, B - 8, "", "lbl-g", "end"), off = T(tp, 0, 0, "", "lbl-d", "middle");
  function draw() {
    const c = calc();
    keys.forEach(k => { outEl(k).textContent = k === "b" ? (Math.abs(st.b - NEURON_B) < 1e-9 ? "6.8814" : py(+st.b.toFixed(2))) : py(+st[k].toFixed(2)); });
    txt.x1.textContent = fmt(st.x1); txt.x2.textContent = fmt(st.x2);
    txt.w1.textContent = "w₁ = " + fmt(st.w1); txt.w2.textContent = "w₂ = " + fmt(st.w2);
    txt.b.textContent = "b = " + (Math.abs(st.b - NEURON_B) < 1e-9 ? "6.8814" : fmt(st.b));
    txt.n.textContent = "n = " + c.n.toFixed(4); txt.o.textContent = c.o.toFixed(3);
    txt.go.textContent = "grad 1.0"; txt.gn.textContent = "grad " + c.dn.toFixed(4);
    txt.gb.textContent = "grad " + c.db.toFixed(4);
    txt.gw1.textContent = "grad " + c.dw1.toFixed(4); txt.gw2.textContent = "grad " + c.dw2.toFixed(4);
    txt.gx1.textContent = "grad " + c.dx1.toFixed(4); txt.gx2.textContent = "grad " + c.dx2.toFixed(4);
    txt.loc.textContent = "1 − o² = " + c.dn.toFixed(3);
    weightStyle(wl1, st.w1); weightStyle(wl2, st.w2);
    const nn = clamp(c.n, N0, N1);
    dot.setAttribute("cx", tx(nn)); dot.setAttribute("cy", ty(Math.tanh(nn)));
    const sp = 1.1;
    tan.setAttribute("x1", tx(nn - sp)); tan.setAttribute("y1", ty(Math.tanh(nn) - c.dn * sp));
    tan.setAttribute("x2", tx(nn + sp)); tan.setAttribute("y2", ty(Math.tanh(nn) + c.dn * sp));
    tlab.textContent = "local slope " + c.dn.toFixed(3);
    off.textContent = c.n > N1 ? "n = " + c.n.toFixed(1) + " →" : c.n < N0 ? "← n = " + c.n.toFixed(1) : "";
    off.setAttribute("x", c.n > N1 ? R - 40 : L + 40); off.setAttribute("y", ty(c.n > 0 ? 1 : -1) + (c.n > 0 ? 18 : -10));
    subs.forEach(f => f(c));
  }
  keys.forEach(k => sl[k].addEventListener("input", () => { st[k] = +sl[k].value; draw(); }));
  $("#nr-karpathy").addEventListener("click", () => { Object.assign(st, K); keys.forEach(k => { sl[k].value = st[k]; }); draw(); });
  draw();

  // ---- 3D surface: o = tanh(w1 x1 + w2 x2 + b) over the input plane ----
  const host = $("#nr-3d");
  whenNear(host, () => {
    const s3 = new Stage(host, { dist: 13.5, theta: 0.85, phi: 1.0, target: [0, -0.3, 0], autoRotate: true, label: "Neuron output surface" });
    if (!s3.ok) return;
    const HS = 1.3, R3 = 3;
    const fn = (x, z) => Math.tanh(st.w1 * x + st.w2 * z + st.b) * HS;
    s3.grid(R3, 0.5, -HS - 0.25, "--rule", 0.8);
    const surf = heightSurface(s3, { x: [-R3, R3], z: [-R3, R3], n: 60, fn, range: [-HS, HS], lo: "--wash", hi: "--data", wire: "--ink", wireOpacity: 0.12, wireStep: 1 });
    const ax1 = s3.label("x₁ →", "axis"); ax1.pos.set(R3 + 0.6, -HS - 0.25, 0);
    const ax2 = s3.label("x₂ →", "axis"); ax2.pos.set(0, -HS - 0.25, R3 + 0.6);
    const top = s3.label("o = +1", "axis"); top.pos.set(-R3, HS + 0.2, -R3);
    const bot = s3.label("o = −1", "axis"); bot.pos.set(R3, -HS - 0.05, -R3);
    const ball = s3.sphere("--data", 0.13);
    const tag = s3.label("", "tag");
    let key = "";
    subs.push(c => {
      const k = [st.w1, st.w2, st.b].join(",");
      if (k !== key) { key = k; surf.update(fn); }
      const x = clamp(st.x1, -R3, R3), z = clamp(st.x2, -R3, R3);
      ball.position.set(x, fn(x, z) + 0.13, z);
      tag.pos.set(x, fn(x, z) + 0.55, z); tag.set("o = " + c.o.toFixed(3));
      s3.invalidate();
    });
    draw();
  });

  // ---- Karpathy's neuron graph, backpropagated step by step ----
  const G = graph2D($("#g-nr"), NEURON_SPEC("gnr"));
  const clear = () => G.fill(id => G.N[id].data, () => 0);
  clear();
  let busy = false;
  $("#gnr-reset").addEventListener("click", () => { if (!busy) clear(); });
  $("#gnr-run").addEventListener("click", async () => {
    if (busy) return; busy = true; clear();
    const g = id => G.N[id].grad;
    G.setGrad("o", 1); G.flash("o", "hlg"); await sleep(500);
    const steps = [["t", ["n"]], ["a2", ["s", "b"]], ["a1", ["x1w1", "x2w2"]], ["m1", ["x1", "w1"]], ["m2", ["x2", "w2"]]];
    for (const [op, ins] of steps) {
      const o = G.OPS[op];
      await G.dot(op + ">" + o.out, true, "dot-b");
      await Promise.all(ins.map(i => G.dot(i + ">" + op, true, "dot-b")));
      ins.forEach(i => { G.setGrad(i, g(i)); G.flash(i, "hlg"); });
      await sleep(350);
    }
    busy = false;
  });
});
