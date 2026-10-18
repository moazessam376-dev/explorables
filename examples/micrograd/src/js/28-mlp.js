// A multi-layer perceptron in 3D: spheres are neurons, rods are weights.
function ringPos(n) {
  if (n === 1) return [[0, 0]];
  if (n === 4) return [[0.9, -0.9], [0.9, 0.9], [-0.9, -0.9], [-0.9, 0.9]];
  const r = n === 2 ? 0.8 : Math.max(1, 0.32 * n), out = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / n; out.push([r * Math.sin(a) * 1.1, r * Math.cos(a)]); }
  return out;
}
function mlp3D(host, model, opts) {
  opts = opts || {};
  const st = new Stage(host, { dist: 14, theta: 0.55, phi: 1.12, target: [0, 0, 0], autoRotate: !!opts.autoRotate, autoSpeed: 0.0012, label: "Neural network in 3D" });
  if (!st.ok) return null;
  const sizes = model.sizes, NL = sizes.length;
  const LX = sizes.map((_, i) => (i - (NL - 1) / 2) * 3.4);
  const P = sizes.map((n, l) => ringPos(n).map(([y, z]) => new THREE.Vector3(LX[l], y, z)));
  const posM = st.mat("--ok", { roughness: 0.5 }), negM = st.mat("--neg", { roughness: 0.5 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const W = []; // W[l][j][i]: rod from P[l][i] to P[l+1][j]
  const up = new THREE.Vector3(0, 1, 0);
  for (let l = 0; l < NL - 1; l++) {
    W.push(P[l + 1].map(to => P[l].map(from => {
      const m = new THREE.Mesh(cyl, posM);
      const dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
      m.position.copy(from).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(up, dir.normalize());
      m.userData.len = len;
      st.scene.add(m);
      return m;
    })));
  }
  const nodes = [], panel = new THREE.Color(), cP = new THREE.Color(), cN = new THREE.Color();
  const readColors = () => { panel.set(cssVar("--wash")); cP.set(cssVar("--ok")); cN.set(cssVar("--neg")); };
  readColors();
  sizes.forEach((n, l) => {
    nodes.push(P[l].map(p => {
      const geo = l === 0 ? new THREE.BoxGeometry(0.42, 0.42, 0.42) : new THREE.SphereGeometry(0.3, 24, 16);
      const mat = l === 0 ? st.mat("--data") : new THREE.MeshStandardMaterial({ color: panel.clone(), roughness: 0.45 });
      const s = new THREE.Mesh(geo, mat);
      s.position.copy(p); s.userData = { l };
      st.scene.add(s);
      return s;
    }));
  });
  nodes.forEach((layer, l) => layer.forEach((s, j) => { s.userData.j = j; }));
  const inLabs = P[0].map(p => { const L = st.label(""); L.pos.copy(p).add(new THREE.Vector3(0, 0.45, 0)); return L; });
  const outLab = st.label(""); outLab.pos.copy(P[NL - 1][0]).add(new THREE.Vector3(0, 0.55, 0));
  const selLab = st.label("", "tag"); selLab.show = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), st.mat("--nudge"));
  ring.visible = false; st.scene.add(ring);
  ["input", "hidden 1", "hidden 2", "output"].forEach((t, l) => { if (l < NL) { const L = st.label(t, "axis"); L.pos.set(LX[l], -2.2, 0); } });
  let acts = null;
  const div = v => { const t = clamp(v, -1, 1); return panel.clone().lerp(t >= 0 ? cP : cN, Math.abs(t)); };
  const api = {
    st, P, nodes, model,
    weights() {
      this.model.layers.forEach((layer, l) => layer.neurons.forEach((nr, j) => nr.w.forEach((w, i) => {
        const m = W[l][j][i], r = clamp(0.012 + 0.045 * Math.abs(w.data), 0.012, 0.11);
        m.material = w.data >= 0 ? posM : negM;
        m.scale.set(r, m.userData.len, r);
      })));
      st.invalidate();
    },
    setActs(a, upto) {
      acts = a;
      a.forEach((layer, l) => layer.forEach((v, j) => {
        const val = v instanceof V ? v.data : v;
        if (l > 0) nodes[l][j].material.color.copy(upto != null && l > upto ? panel : div(val));
      }));
      a[0].forEach((v, i) => inLabs[i].set(`<span class="d">x${i + 1} = ${py(+(v instanceof V ? v.data : v).toFixed(2))}</span>`));
      const o = a[NL - 1][0], ov = o instanceof V ? o.data : o;
      outLab.set(upto != null && upto < NL - 1 ? "out = ?" : `out = <span class="d">${ov.toFixed(3)}</span>`);
      st.invalidate();
    },
    select(l, j) {
      if (l == null) { ring.visible = false; selLab.show = false; st.invalidate(); return; }
      ring.visible = true; ring.position.copy(P[l][j]); ring.lookAt(st.camera.position);
      selLab.show = true; selLab.pos.copy(P[l][j]).add(new THREE.Vector3(0, -0.5, 0));
      selLab.set(`layer ${l} · neuron ${j + 1}`);
      st.invalidate();
    },
    async pulse(l) {
      if (RM) return;
      const balls = [];
      W[l].forEach((row, j) => row.forEach((m, i) => { const b = st.sphere("--data", 0.06); balls.push([b, P[l][i], P[l + 1][j]]); }));
      await st.anim(520, p => balls.forEach(([b, a, c]) => b.position.lerpVectors(a, c, ease(p))));
      balls.forEach(([b]) => { st.scene.remove(b); b.geometry.dispose(); });
    }
  };
  st.onTheme(() => { readColors(); if (acts) api.setActs(acts); });
  st.onPick = ray => {
    const hits = ray.intersectObjects(nodes.slice(1).flat());
    if (hits.length && opts.onSelect) opts.onSelect(hits[0].object.userData.l, hits[0].object.userData.j);
  };
  api.weights();
  return api;
}

// "Neuron, Layer, MLP" section
safe("mlp", () => {
  const ids = ["x1", "x2", "x3"];
  const sl = Object.fromEntries(ids.map(k => [k, $("#ml-" + k)]));
  const outEl = k => sl[k].parentElement.querySelector("output");
  let seed = 7, model = new MLP(3, [4, 4, 1], seed), sel = null, M = null, revealed = true;
  const xs = () => ids.map(k => +sl[k].value);
  function info() {
    const acts = model.trace(xs());
    ids.forEach(k => { outEl(k).textContent = py(+sl[k].value); });
    const out = acts[3][0].data;
    let html = `<dt>output</dt><dd class="c-data">${revealed ? out.toFixed(4) : "?"}</dd><dt>parameters</dt><dd>${model.parameters().length} (weights + biases)</dd>`;
    if (sel) {
      const [l, j] = sel, nr = model.layers[l - 1].neurons[j], ins = acts[l - 1].map(v => v.data);
      const terms = nr.w.map((w, i) => `(${w.data.toFixed(2)})(${ins[i].toFixed(2)})`).join(" + ");
      const n = nr.w.reduce((s, w, i) => s + w.data * ins[i], nr.b.data);
      html += `<dt>layer ${l}, neuron ${j + 1}</dt><dd>tanh(${terms} + ${nr.b.data.toFixed(2)}) = tanh(${n.toFixed(3)}) = <b class="c-data">${Math.tanh(n).toFixed(3)}</b></dd>`;
    } else html += `<dt>tip</dt><dd>click a sphere to see the calculation inside that neuron</dd>`;
    $("#ml-read").innerHTML = html;
    return acts;
  }
  function refresh() { const acts = info(); if (M) M.setActs(acts); }
  ids.forEach(k => sl[k].addEventListener("input", () => { revealed = true; refresh(); }));
  const host = $("#mlp3d");
  whenNear(host, () => {
    M = mlp3D(host, model, { autoRotate: true, onSelect: (l, j) => { sel = [l, j]; M.select(l, j); refresh(); } });
    refresh();
  });
  let busy = false;
  $("#ml-fwd").addEventListener("click", async () => {
    if (busy || !M) return; busy = true; M.st.auto = false;
    const acts = model.trace(xs());
    revealed = false; M.setActs(acts, 0); info();
    for (let l = 0; l < 3; l++) { await M.pulse(l); M.setActs(acts, l + 1); await sleep(120); }
    revealed = true; refresh(); busy = false;
  });
  $("#ml-rand").addEventListener("click", () => {
    if (busy) return;
    seed += 1; model = new MLP(3, [4, 4, 1], seed);
    if (M) { M.model = model; M.weights(); M.select(null); }
    sel = null; refresh();
  });
  refresh();
});
