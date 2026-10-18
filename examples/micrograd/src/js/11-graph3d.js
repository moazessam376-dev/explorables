// The expression L = (a*b + c)*f in 3D. Each node carries a blue bar (its value) and an
// orange bar (its gradient). Used in "What micrograd is" and "One optimization step".
function graph3D(host, opts) {
  const st = new Stage(host, { dist: 15.5, theta: 0.18, phi: 0.9, target: [0, 0.3, 0.3], autoRotate: !!opts.autoRotate, autoSpeed: 0.0008, label: "Expression graph in 3D" });
  if (!st.ok) return null;
  const SC = 0.16, PT = 0.06;
  const P = {
    a: [-6, -2.6], b: [-6, -0.2], e: [-2, -1.4], c: [-2, 1.4],
    d: [2, 0], f: [2, 2.6], L: [6, 1.3]
  };
  const OPS = [
    { id: "op1", sym: "×", at: [-4, -1.4], ins: ["a", "b"], out: "e" },
    { id: "op2", sym: "+", at: [0, 0], ins: ["e", "c"], out: "d" },
    { id: "op3", sym: "×", at: [4, 1.3], ins: ["d", "f"], out: "L" }
  ];
  st.grid(8, 1, 0, "--rule", 0.7);
  const plMat = st.mat("--panel"), edgeMat = st.lineMat("--ink", 0.55);
  const dMat = st.mat("--data"), gMat = st.mat("--grad");
  const N = {};
  for (const id in P) {
    const [x, z] = P[id];
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.9), plMat);
    pl.position.set(x, 0.0, z); st.scene.add(pl);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(pl.geometry), edgeMat);
    ed.position.copy(pl.position); st.scene.add(ed);
    const db = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1, 0.38), dMat);
    const gb = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1, 0.38), gMat);
    st.scene.add(db, gb);
    const lab = st.label("");
    N[id] = { x, z, db, gb, lab, dCur: 0, gCur: 0, dT: 0, gT: 0, data: null, grad: 0, pl };
  }
  const opMat = st.mat("--wash");
  const E = {};
  OPS.forEach(o => {
    const [x, z] = o.at;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 28), opMat);
    disc.position.set(x, 0.04, z); st.scene.add(disc);
    const l = st.label(`<span class="big">${o.sym}</span>`, "axis"); l.pos.set(x, 0.32, z);
    const seg = (fx, fz, tx, tz) => [[fx, PT, fz], [(fx + tx) / 2, PT + 0.05, (fz + tz) / 2], [tx, PT, tz]];
    o.ins.forEach(i => { E[i + ">" + o.id] = st.tube(seg(P[i][0] + 0.62, P[i][1], x - 0.3, z), 0.03, "--muted"); });
    E[o.id + ">" + o.out] = st.tube(seg(x + 0.3, z, P[o.out][0] - 0.62, P[o.out][1]), 0.03, "--muted");
  });
  // bars ease toward their targets every frame
  function setBar(mesh, cur, dx, n) {
    const h = Math.abs(cur) * SC;
    mesh.visible = h > 0.004;
    mesh.scale.set(1, Math.max(h, 0.001), 1);
    mesh.position.set(n.x + dx, cur >= 0 ? 0.05 + h / 2 : -h / 2, n.z);
  }
  function labelFor(id) {
    const n = N[id];
    const dv = n.data == null ? '<span class="m">?</span>' : f2(n.data);
    const gv = n.grad === 0 ? '<span class="m">0.00</span>' : f2(n.grad);
    n.lab.set(`<span class="big">${id}</span><br><span class="d">${dv}</span> <span class="m">|</span> <span class="g">${gv}</span>`);
    const top = Math.max(0.12, n.dCur * SC + 0.05, n.gCur * SC + 0.05);
    n.lab.pos.set(n.x, top + 0.25, n.z);
  }
  let moving = false;
  function settle() {
    if (moving) return;
    moving = true;
    st.tick(() => {
      let still = true;
      for (const id in N) {
        const n = N[id];
        n.dCur += (n.dT - n.dCur) * (RM ? 1 : 0.16); n.gCur += (n.gT - n.gCur) * (RM ? 1 : 0.16);
        if (Math.abs(n.dT - n.dCur) > 1e-3 || Math.abs(n.gT - n.gCur) > 1e-3) still = false; else { n.dCur = n.dT; n.gCur = n.gT; }
        setBar(n.db, n.dCur, -0.28, n); setBar(n.gb, n.gCur, 0.28, n); labelFor(id);
      }
      if (still) { moving = false; return false; }
      return true;
    });
  }
  async function pulse(key, reverse, v) {
    const tube = E[key]; if (!tube || RM) return;
    const s = st.sphere(v, 0.1);
    const curve = tube.userData.curve;
    await st.anim(380, p => { s.position.copy(curve.getPointAt(reverse ? 1 - p : p)); s.position.y += 0.08; });
    st.scene.remove(s); s.geometry.dispose();
  }
  const S0 = { a: 2, b: -3, c: 10, f: -2 };
  const api = {
    st, N, leaves: Object.assign({}, S0), fwd: false, bwd: false, onChange: null,
    values() {
      const { a, b, c, f } = this.leaves, e = a * b, d = e + c, L = d * f;
      return { a, b, c, f, e, d, L };
    },
    grads() {
      const { a, b, f, d } = this.values();
      return { L: 1, d: f, f: d, e: f, c: f, a: f * b, b: f * a };
    },
    show() {
      const v = this.values(), g = this.grads();
      for (const id in N) {
        const leaf = id in this.leaves;
        N[id].data = leaf || this.fwd ? v[id] : null;
        N[id].dT = N[id].data == null ? 0 : v[id];
        N[id].grad = this.bwd ? g[id] : 0;
        N[id].gT = N[id].grad;
      }
      settle();
      if (this.onChange) this.onChange(v, this.bwd ? g : null);
    },
    reset(leaves) { this.leaves = Object.assign({}, leaves || S0); this.fwd = false; this.bwd = false; this.show(); },
    async forward() {
      this.bwd = false; this.show();
      for (const o of OPS) {
        await Promise.all(o.ins.map(i => pulse(i + ">" + o.id, false, "--data")));
        await pulse(o.id + ">" + o.out, false, "--data");
        const v = this.values();
        N[o.out].data = v[o.out]; N[o.out].dT = v[o.out]; settle();
        await sleep(140);
      }
      this.fwd = true; this.show();
    },
    async backward() {
      if (!this.fwd) await this.forward();
      const g = this.grads();
      N.L.grad = 1; N.L.gT = 1; settle(); await sleep(350);
      for (const o of OPS.slice().reverse()) {
        await pulse(o.id + ">" + o.out, true, "--grad");
        await Promise.all(o.ins.map(i => pulse(i + ">" + o.id, true, "--grad")));
        o.ins.forEach(i => { N[i].grad = g[i]; N[i].gT = g[i]; });
        settle(); await sleep(160);
      }
      this.bwd = true; this.show();
    }
  };
  st.onTheme(() => { for (const id in N) labelFor(id); });
  api.reset();
  return api;
}

// "What micrograd is": the 3D graph with sliders.
safe("graph3d-overview", () => {
  const host = $("#g3-over");
  whenNear(host, () => {
    const G = graph3D(host, { autoRotate: false });
    if (!G) return;
    const ids = ["a", "b", "c", "f"];
    const sl = Object.fromEntries(ids.map(k => [k, $("#ov-" + k)]));
    const out = k => sl[k].parentElement.querySelector("output");
    function syncSliders() { ids.forEach(k => { sl[k].value = G.leaves[k]; out(k).textContent = py(G.leaves[k]); }); }
    G.onChange = (v, g) => {
      const fmt = x => py(+x.toFixed(4));
      let html = `<dt>L</dt><dd>(a·b + c)·f = (${fmt(v.a)}·${fmt(v.b)} + ${fmt(v.c)})·${fmt(v.f)} = <b class="c-data">${G.fwd ? fmt(v.L) : "?"}</b></dd>`;
      if (g) html += `<dt class="c-grad">grads</dt><dd>a ${fmt(g.a)} · b ${fmt(g.b)} · c ${fmt(g.c)} · e ${fmt(g.e)} · d ${fmt(g.d)} · f ${fmt(g.f)} · L ${fmt(g.L)}</dd>`;
      else html += `<dt class="c-grad">grads</dt><dd>${G.fwd ? "press Backward pass" : "run the forward pass first"}</dd>`;
      $("#ov-read").innerHTML = html;
    };
    let busy = false;
    const bF = $("#ov-fwd"), bB = $("#ov-bwd"), bR = $("#ov-reset");
    const lock = on => { busy = on; [bF, bB, bR].forEach(b => { b.disabled = on; }); };
    bF.addEventListener("click", async () => { if (busy) return; G.st.auto = false; lock(true); G.fwd = false; await G.forward(); lock(false); });
    bB.addEventListener("click", async () => { if (busy) return; G.st.auto = false; lock(true); await G.backward(); lock(false); });
    bR.addEventListener("click", () => { if (busy) return; G.reset(); syncSliders(); });
    ids.forEach(k => sl[k].addEventListener("input", () => { G.leaves[k] = +sl[k].value; out(k).textContent = py(G.leaves[k]); G.show(); }));
    syncSliders(); G.show();
  });
});
