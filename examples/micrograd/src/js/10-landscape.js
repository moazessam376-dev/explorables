// Big picture: a 3D loss landscape over two weights, with a ball you step downhill.
safe("landscape", () => {
  const host = $("#land");
  whenNear(host, () => {
    const st = new Stage(host, { dist: 11, theta: 0.75, phi: 0.84, target: [0, 0.5, 0], autoRotate: true, label: "Loss landscape over two weights" });
    if (!st.ok) return;
    // a deep valley near (1.1, 0.9) and a shallower one near (-1.4, -1.1)
    const C = (x, z) => 1.9 + 0.06 * (x * x + z * z)
      - 1.5 * Math.exp(-((x - 1.1) ** 2 + (z - 0.9) ** 2) / 2.0)
      - 1.05 * Math.exp(-((x + 1.4) ** 2 + (z + 1.1) ** 2) / 1.3)
      + 0.12 * Math.sin(1.6 * x) * Math.cos(1.3 * z);
    const grad = (x, z) => { const e = 1e-5; return [(C(x + e, z) - C(x - e, z)) / (2 * e), (C(x, z + e) - C(x, z - e)) / (2 * e)]; };
    const Y = c => (c - 0.5) * 1.05;          // loss -> height
    const FLOOR = -0.08, R = 3;
    st.grid(R, 0.5, FLOOR - 0.001, "--rule", 0.8);
    const surf = heightSurface(st, { x: [-R, R], z: [-R, R], n: 90, fn: (x, z) => Y(C(x, z)), range: [0, 2.6], lo: "--data", hi: "--grad-soft" });
    const levels = []; for (let l = 0.6; l < 3.2; l += 0.2) levels.push(l);
    const cFloor = st.segments(contours(C, -R, R, -R, R, 70, levels, () => FLOOR + 0.004), "--muted", 0.55);
    const cSurf = st.segments(contours(C, -R, R, -R, R, 70, levels, (x, z) => Y(C(x, z)) + 0.012), "--ink", 0.25);
    // axes labels
    const ax1 = st.label("w₁", "axis"); ax1.pos.set(R + 0.5, FLOOR, 0);
    const ax2 = st.label("w₂", "axis"); ax2.pos.set(0, FLOOR, R + 0.5);
    const axL = st.label("loss ↑", "axis"); axL.pos.set(-R, 2.9, -R);

    const ball = st.sphere("--data", 0.13);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), st.basic("--data", { transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2; st.scene.add(shadow);
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), st.lineMat("--data", 0.5));
    st.scene.add(stem);
    const up = st.arrow("--grad", 0.035), down = st.arrow("--ok", 0.035);
    const tag = st.label("", "tag");
    const trailMat = st.lineMat("--data", 0.9);
    let trail = null;
    const trailPts = [];
    function drawTrail() {
      if (trail) { st.scene.remove(trail); trail.geometry.dispose(); }
      if (trailPts.length < 2) { trail = null; return; }
      const pts = [];
      for (let i = 1; i < trailPts.length; i++) {
        const [ax, az] = trailPts[i - 1], [bx, bz] = trailPts[i];
        for (let s = 0; s <= 12; s++) { const x = lerp(ax, bx, s / 12), z = lerp(az, bz, s / 12); pts.push(new THREE.Vector3(x, Y(C(x, z)) + 0.03, z)); }
      }
      trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), trailMat);
      st.scene.add(trail);
    }

    const START = [2.6, 2.4];
    let w = START.slice(), k = 0, lr = 0.5, busy = false, lastUpd = "";
    let showArrows = true;
    function place(x, z) {
      const y = Y(C(x, z));
      ball.position.set(x, y + 0.13, z);
      shadow.position.set(x, FLOOR + 0.006, z);
      stem.geometry.setFromPoints([new THREE.Vector3(x, FLOOR, z), new THREE.Vector3(x, y, z)]);
      const [gx, gz] = grad(x, z), m = Math.hypot(gx, gz), sc = m > 0 ? Math.min(0.95, 2.2 / m) : 0;
      const from = new THREE.Vector3(x, FLOOR + 0.02, z);
      up.set(from, new THREE.Vector3(x + gx * sc, FLOOR + 0.02, z + gz * sc));
      down.set(from, new THREE.Vector3(x - gx * sc, FLOOR + 0.02, z - gz * sc));
      up.grp.visible = up.grp.visible && showArrows; down.grp.visible = down.grp.visible && showArrows;
      tag.pos.set(x, y + 0.45, z);
      tag.set(`loss ${C(x, z).toFixed(2)}`);
      st.invalidate();
    }
    const strip = $$("#loop-strip .s");
    function stage(key) { strip.forEach(s => s.classList.toggle("on", s.dataset.k === key)); }
    function readout() {
      const [gx, gz] = grad(w[0], w[1]);
      $("#land-read").innerHTML =
        `<dt>step</dt><dd>${k}</dd>` +
        `<dt class="c-data">weights</dt><dd>w₁ = ${w[0].toFixed(3)}, w₂ = ${w[1].toFixed(3)}</dd>` +
        `<dt>loss</dt><dd>${C(w[0], w[1]).toFixed(4)}</dd>` +
        `<dt class="c-grad">gradient</dt><dd>(${gx.toFixed(3)}, ${gz.toFixed(3)})   <span style="color:var(--muted)">one slope per weight</span></dd>` +
        `<dt class="c-nudge">update</dt><dd>${lastUpd || "w ← w − " + lr + " × gradient"}</dd>`;
    }
    function reset(x, z) {
      w = [x, z]; k = 0; lastUpd = ""; trailPts.length = 0; trailPts.push([x, z]); drawTrail();
      place(x, z); stage(null); readout();
    }
    async function step(fast) {
      const dl = fast ? 60 : 320;
      stage("fwd"); await sleep(dl);
      stage("loss"); await sleep(dl);
      stage("bwd"); await sleep(dl * 1.2);
      stage("upd");
      const [gx, gz] = grad(w[0], w[1]);
      const nx = clamp(w[0] - lr * gx, -R, R), nz = clamp(w[1] - lr * gz, -R, R);
      lastUpd = `w₁ ← ${w[0].toFixed(3)} − ${lr}×${gx.toFixed(3)} = ${nx.toFixed(3)} ;  w₂ ← ${w[1].toFixed(3)} − ${lr}×${gz.toFixed(3)} = ${nz.toFixed(3)}`;
      const ox = w[0], oz = w[1];
      await st.anim(fast ? 160 : 520, p => { const e = ease(p); place(lerp(ox, nx, e), lerp(oz, nz, e)); });
      w = [nx, nz]; k++; trailPts.push([nx, nz]); drawTrail(); place(nx, nz); readout();
      await sleep(dl / 2); stage(null);
    }
    const btns = ["#land-step", "#land-run", "#land-reset"].map(s => $(s));
    const lock = on => { busy = on; btns.forEach(b => { b.disabled = on; }); };
    btns[0].addEventListener("click", async () => { if (busy) return; st.auto = false; lock(true); await step(false); lock(false); });
    btns[1].addEventListener("click", async () => { if (busy) return; st.auto = false; lock(true); for (let i = 0; i < 15; i++) await step(true); lock(false); });
    btns[2].addEventListener("click", () => { if (!busy) reset(START[0], START[1]); });
    st.onPick = ray => {
      if (busy) return;
      const hit = ray.intersectObject(surf.mesh)[0];
      if (hit) reset(clamp(hit.point.x, -R, R), clamp(hit.point.z, -R, R));
    };
    $$("#land-lr button").forEach(b => b.addEventListener("click", () => {
      if (busy) return;
      lr = +b.dataset.lr;
      $$("#land-lr button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      lastUpd = ""; readout();
    }));
    $("#land-arrows").addEventListener("change", e => { showArrows = e.target.checked; place(w[0], w[1]); });
    $("#land-contours").addEventListener("change", e => { cFloor.visible = cSurf.visible = e.target.checked; st.invalidate(); });
    reset(START[0], START[1]);
  });
});
