// Many inputs: the three knobs, Karpathy's nudge cell, and the 3D surface d = a*b + c.
safe("multi", () => {
  const ins = { a: $("#m-a"), b: $("#m-b"), c: $("#m-c") };
  const state = { a: 2, b: -3, c: 10 };
  const subs = [];
  function sync(from) {
    ["a", "b", "c"].forEach(k => {
      $("#m-" + k + "-o").textContent = py(+state[k].toFixed(2));
      if (from !== "slider") ins[k].value = state[k];
    });
    $("#m-ab").textContent = py(+(state.a * state.b).toFixed(4));
    $("#m-d").textContent = py(+(state.a * state.b + state.c).toFixed(4));
    subs.forEach(f => f());
  }
  Object.keys(ins).forEach(k => ins[k].addEventListener("input", () => { state[k] = +ins[k].value; sync("slider"); }));
  let busy = false;
  const nudgeFx = [];
  $$("#s-multi [data-nudge]").forEach(btn => btn.addEventListener("click", async () => {
    if (busy) return; busy = true;
    const k = btn.dataset.nudge, h = 0.0001;
    let { a, b, c } = state;
    const d1 = a * b + c;
    if (k === "a") a += h; else if (k === "b") b += h; else c += h;
    const d2 = a * b + c, slope = (d2 - d1) / h;
    const card = $("#k-" + k), out = $("#m-" + k + "-o");
    card.classList.add("nudged"); out.textContent = py(k === "a" ? a : k === "b" ? b : c);
    const pr = $("#m-print");
    pr.innerHTML = `<span class="k"># ${k} += h</span>\n`;
    nudgeFx.forEach(fn => fn(k));
    await sleep(380); pr.innerHTML += `d1 ${py(d1)}\n`;
    await sleep(380); pr.innerHTML += `d2 ${py(d2)}\n`;
    await sleep(380); pr.innerHTML += `slope ${py(slope)}`;
    await sleep(1100); card.classList.remove("nudged"); sync();
    busy = false;
  }));
  sync();

  const host = $("#saddle");
  whenNear(host, () => {
    const st = new Stage(host, { dist: 22, theta: 0.62, phi: 1.0, target: [0, -0.9, 0], autoRotate: true, label: "Surface of d equals a times b plus c" });
    if (!st.ok) return;
    const K = 0.12, R = 5, FLOOR = -4.4;
    const H = (a, b) => (a * b + state.c) * K;
    st.grid(R, 1, FLOOR, "--rule", 0.9);
    const surf = heightSurface(st, { x: [-R, R], z: [-R, R], n: 50, fn: (x, z) => H(x, z), range: [-4.2, 4.2], lo: "--wash", hi: "--data", wire: "--ink", wireOpacity: 0.18, opacity: 0.93 });
    const lA = st.label("a →", "axis"); lA.pos.set(R + 0.8, FLOOR, 0);
    const lB = st.label("b →", "axis"); lB.pos.set(0, FLOOR, R + 0.8);
    const lD = st.label("d ↑", "axis"); lD.pos.set(-R, 3.6, -R);
    const ball = st.sphere("--data", 0.22);
    const ghost = st.sphere("--nudge", 0.17); ghost.visible = false;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), st.basic("--data", { transparent: true, opacity: 0.4 }));
    shadow.rotation.x = -Math.PI / 2; st.scene.add(shadow);
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), st.lineMat("--data", 0.5));
    st.scene.add(stem);
    const tag = st.label("", "tag");
    // slices: straight lines through the ball (the surface is made of straight lines!)
    let sliceA = null, sliceB = null;
    const labA = st.label(""), labB = st.label("");
    const gUp = st.arrow("--grad", 0.06), gDown = st.arrow("--ok", 0.06);
    const planeMat = st.basic("--grad", { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), planeMat);
    st.scene.add(plane);
    const runSeg = st.tube([[0, 0, 0], [0.01, 0, 0]], 0.04, "--nudge"); runSeg.visible = false;
    const show = { slices: true, arrow: true, plane: false };
    function rebuildSlices() {
      [sliceA, sliceB].forEach(s => { if (s) { st.scene.remove(s); s.geometry.dispose(); } });
      const { a, b } = state;
      sliceA = st.tube([[-R, H(-R, b), b], [0, H(0, b), b], [R, H(R, b), b]], 0.045, "--grad");
      sliceB = st.tube([[a, H(a, -R), -R], [a, H(a, 0), 0], [a, H(a, R), R]], 0.045, "--grad");
      sliceA.visible = sliceB.visible = show.slices;
      labA.show = labB.show = show.slices;
      labA.set(`<span class="g">along a: slope = b = ${py(+b.toFixed(2))}</span>`); labA.pos.set(R + 0.2, H(R, b) + 0.3, b);
      labB.set(`<span class="g">along b: slope = a = ${py(+a.toFixed(2))}</span>`); labB.pos.set(a, H(a, R) + 0.3, R + 0.2);
    }
    function render() {
      const { a, b } = state, y = H(a, b);
      ball.position.set(a, y + 0.22, b);
      shadow.position.set(a, FLOOR + 0.01, b);
      stem.geometry.setFromPoints([new THREE.Vector3(a, FLOOR, b), new THREE.Vector3(a, y, b)]);
      tag.pos.set(a, y + 0.75, b); tag.set(`d = ${py(+(a * b + state.c).toFixed(3))}`);
      rebuildSlices();
      const g = new THREE.Vector3(b, 0, a), m = g.length(), sc = m > 0 ? Math.min(0.45, 3 / m) : 0;
      const from = new THREE.Vector3(a, FLOOR + 0.03, b);
      gUp.set(from, from.clone().addScaledVector(g, sc)); gDown.set(from, from.clone().addScaledVector(g, -sc));
      gUp.grp.visible = gUp.grp.visible && show.arrow; gDown.grp.visible = gDown.grp.visible && show.arrow;
      // tangent plane through the ball: rise b per unit of a, a per unit of b
      const s = 1.8, pg = plane.geometry, p = pg.attributes.position;
      [[-s, -s], [s, -s], [-s, s], [s, s]].forEach(([du, dv], i) => {
        p.setXYZ(i, a + du, y + K * (b * du + a * dv) + 0.01, b + dv);
      });
      p.needsUpdate = true; pg.computeBoundingSphere();
      plane.visible = show.plane;
      st.invalidate();
    }
    let lastC = state.c;
    subs.push(() => {
      if (state.c !== lastC) { lastC = state.c; surf.update((x, z) => H(x, z)); }
      render();
    });
    // drag the ball across the surface
    st.addDrag(ball, ray => {
      const hit = ray.intersectObject(surf.mesh)[0];
      if (!hit) return;
      state.a = clamp(Math.round(hit.point.x * 10) / 10, -R, R);
      state.b = clamp(Math.round(hit.point.z * 10) / 10, -R, R);
      sync();
    }, { start: () => { st.auto = false; } });
    $("#sd-slices").addEventListener("change", e => { show.slices = e.target.checked; render(); });
    $("#sd-arrow").addEventListener("change", e => { show.arrow = e.target.checked; render(); });
    $("#sd-plane").addEventListener("change", e => { show.plane = e.target.checked; render(); });
    // nudge animation: walk a visible step along the frozen slice, then come back
    nudgeFx.push(async k => {
      st.auto = false;
      const { a, b } = state, D = 1.2;
      const at = t => k === "a" ? [a + D * t, H(a + D * t, b), b] : k === "b" ? [a, H(a, b + D * t), b + D * t] : [a, H(a, b) + D * K * t, b];
      ghost.visible = true;
      await st.anim(900, p => { const [x, y, z] = at(ease(p)); ghost.position.set(x, y + 0.22, z); });
      const [x1, y1, z1] = at(1), y0 = H(a, b);
      st.scene.remove(runSeg);
      const rs = k === "c" ? null : st.tube([[a, y0, b], [(a + x1) / 2, y0, (b + z1) / 2], [x1, y0, z1]], 0.035, "--nudge");
      const rise = st.tube([[x1, y0, z1], [x1, (y0 + y1) / 2, z1], [x1, y1 + 0.001, z1]], 0.035, "--grad");
      await sleep(1500);
      [rs, rise].forEach(t => { if (t) { st.scene.remove(t); t.geometry.dispose(); } });
      await st.anim(500, p => { const [x, y, z] = at(1 - ease(p)); ghost.position.set(x, y + 0.22, z); });
      ghost.visible = false; st.invalidate();
    });
    render();
  });
});
