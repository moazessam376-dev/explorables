// Backprop by hand: a guided game on Karpathy's L graph, plus chain-rule gears.
safe("backprop-game", () => {
  const G = graph2D($("#g-bp"), L_SPEC("bp"));
  const ORDER = ["L", "d", "f", "c", "e", "a", "b"];
  const PARENT = { d: ["L", "op3", "L = d * f"], f: ["L", "op3", "L = d * f"], c: ["d", "op2", "d = e + c"], e: ["d", "op2", "d = e + c"], a: ["e", "op1", "e = a * b"], b: ["e", "op1", "e = a * b"] };
  const OPTS = {
    L: [["1", 1, 1], ["L.data = -8", -8], ["0", 0]],
    d: [["d.data = 4", 4], ["f.data = -2", -2, 1], ["1", 1]],
    f: [["d.data = 4", 4, 1], ["1", 1], ["f.data = -2", -2]],
    c: [["e.data = -6", -6], ["1", 1, 1], ["c.data = 10", 10]],
    e: [["c.data = 10", 10], ["e.data = -6", -6], ["1", 1, 1]],
    a: [["a.data = 2", 2], ["1", 1], ["b.data = -3", -3, 1]],
    b: [["a.data = 2", 2, 1], ["b.data = -3", -3], ["1", 1]]
  };
  const HINT = {
    "*": "For a × node, the local slope of one input is the <b>other</b> input's value (the rule from 14:12).",
    "+": "For a + node, nudging an input by h moves the output by exactly h, so the local slope is 1."
  };
  let i = 0, busy = false;
  const grads = {};
  const q = $("#bp-q"), opts = $("#bp-opts"), eq = $("#bp-eq");
  function reset() {
    i = 0; busy = false;
    for (const k in grads) delete grads[k];
    G.fill(id => G.N[id].data, () => 0);
    G.clearMarks("sel", "done");
    $("#bp-print").innerHTML = '<span class="k"># finish the graph, then check every leaf numerically</span>';
    ask();
  }
  function ask() {
    G.clearMarks("sel");
    if (i >= ORDER.length) {
      q.innerHTML = "Done. Every gradient matches what Karpathy fills in by 49:04. Now press the check button: nudging each leaf gives the same numbers.";
      opts.innerHTML = ""; eq.textContent = "";
      return;
    }
    const id = ORDER[i];
    G.mark(id, "sel", true);
    if (id === "L") {
      q.innerHTML = "Start at the output. What is <var>dL</var>/<var>dL</var>: how much does <var>L</var> move if you nudge <var>L</var> itself?";
    } else {
      const [par, , rel] = PARENT[id];
      q.innerHTML = `<code>${rel}</code>. Local slope: if you nudge <var>${id}</var>, how fast does <var>${par}</var> move? (<var>d${par}</var>/<var>d${id}</var>)`;
    }
    eq.textContent = id === "L" ? "" : `${PARENT[id][0]}.grad = ${py(grads[PARENT[id][0]])}  (the upstream gradient, already done)`;
    opts.innerHTML = "";
    OPTS[id].forEach(([label, , right]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.dataset.right = right ? "1" : "";
      b.addEventListener("click", () => choose(b, id));
      opts.appendChild(b);
    });
  }
  async function choose(btn, id) {
    if (busy) return;
    if (!btn.dataset.right) {
      btn.classList.add("wrong");
      const sym = id === "L" ? null : G.OPS[PARENT[id][1]].sym;
      eq.innerHTML = sym ? HINT[sym] : "Nudge <var>L</var> by <var>h</var> and <var>L</var> changes by exactly <var>h</var>. Rise ÷ run = ?";
      return;
    }
    busy = true;
    btn.classList.add("right");
    const local = OPTS[id].find(o => o[2])[1];
    if (id === "L") {
      grads.L = 1;
      eq.textContent = "L.grad = 1.0    # the base case";
    } else {
      const [par, op] = PARENT[id];
      const up = grads[par];
      await G.dot(op + ">" + par, true, "dot-b");
      await G.dot(id + ">" + op, true, "dot-b");
      grads[id] = local * up;
      eq.textContent = `${id}.grad = (local d${par}/d${id}) × ${par}.grad = ${py(local)} × ${py(up)} = ${py(grads[id])}`;
    }
    G.setGrad(id, grads[id]); G.flash(id, "hlg"); G.mark(id, "done", true);
    await sleep(1200);
    i++; busy = false; ask();
  }
  $("#bp-show").addEventListener("click", () => {
    if (busy || i >= ORDER.length) return;
    const b = $$("button", opts).find(x => x.dataset.right);
    if (b) choose(b, ORDER[i]);
  });
  $("#bp-restart").addEventListener("click", () => { if (!busy) reset(); });
  $("#bp-check").addEventListener("click", async () => {
    // Karpathy's lol(): rebuild the expression, bump one value by h, measure the change in L
    const h = 0.001;
    const run = bump => {
      const a = 2.0 + (bump === "a" ? h : 0), b = -3.0 + (bump === "b" ? h : 0), c = 10.0 + (bump === "c" ? h : 0);
      let e = a * b; if (bump === "e") e += h;
      let d = e + c; if (bump === "d") d += h;
      const f = -2.0 + (bump === "f" ? h : 0);
      let L = d * f; if (bump === "L") L += h;
      return L;
    };
    const L1 = run(null), pr = $("#bp-print");
    pr.innerHTML = '<span class="k"># def lol(): ... L2 with one value nudged by h = 0.001</span>\n';
    for (const id of ["L", "d", "f", "c", "e", "a", "b"]) {
      await sleep(220);
      pr.innerHTML += `nudge ${id}:  dL/d${id} ≈ ${py((run(id) - L1) / h)}\n`;
    }
    pr.innerHTML += '<span class="k"># up to floating-point noise: 1, -2, 4, -2, -2, 6, -4</span>';
  });
  reset();
});

safe("gears", () => {
  const host = $("#gears");
  whenNear(host, () => {
    const st = new Stage(host, { dist: 9.5, theta: 0.32, phi: 1.22, target: [1.25, 0, 0.25], label: "Three gears: man, bicycle, car" });
    if (!st.ok) return;
    function gear(N, r, v, z) {
      const p = 2 * Math.PI / N, rt = r + 0.09, rr = r - 0.11, sh = new THREE.Shape();
      for (let i = 0; i < N; i++) {
        const a0 = i * p, pts = [[rr, a0 - 0.5 * p], [rr, a0 - 0.27 * p], [rt, a0 - 0.13 * p], [rt, a0 + 0.13 * p], [rr, a0 + 0.27 * p]];
        pts.forEach(([rad, a], k) => { const x = rad * Math.cos(a), y = rad * Math.sin(a); if (i === 0 && k === 0) sh.moveTo(x, y); else sh.lineTo(x, y); });
      }
      sh.closePath();
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.1, 0, Math.PI * 2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 6 });
      geo.translate(0, 0, -0.12);
      const m = new THREE.Mesh(geo, st.mat(v, { roughness: 0.45, metalness: 0.15 }));
      const g = new THREE.Group(); g.add(m);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.07, r * 0.09), 16, 12), st.mat("--ink"));
      dot.position.set(r * 0.62, 0, 0.14); g.add(dot);
      g.position.z = z; st.scene.add(g);
      return g;
    }
    const axleMat = st.mat("--muted");
    const axle = (x, z0, z1) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, z1 - z0, 12), axleMat); c.rotation.x = Math.PI / 2; c.position.set(x, 0, (z0 + z1) / 2); st.scene.add(c); };
    const man = gear(32, 1.92, "--data", 0);
    const bike = gear(8, 0.48, "--muted", 0);
    const comp = gear(16, 0.96, "--muted", 0.5);
    const car = gear(8, 0.48, "--grad", 0.5);
    man.position.x = 0; bike.position.x = 2.4; comp.position.x = 2.4; car.position.x = 3.84;
    axle(0, -0.3, 0.3); axle(2.4, -0.3, 0.8); axle(3.84, 0.2, 0.8);
    const lm = st.label(""), lb = st.label(""), lc = st.label("");
    lm.pos.set(0, 2.35, 0); lb.pos.set(2.4, 1.3, 0.25); lc.pos.set(3.84, 0.95, 0.5);
    const sl = $("#gr-turn");
    function set(t) {
      const th = t * 2 * Math.PI;
      man.rotation.z = th;
      bike.rotation.z = Math.PI / 8 - 4 * th;
      comp.rotation.z = -4 * th;
      car.rotation.z = Math.PI / 8 + 8 * th;
      lm.set(`<span class="d">man</span><br><span class="m">${t.toFixed(2)} turns</span>`);
      lb.set(`bicycle<br><span class="m">${(4 * t).toFixed(2)} turns</span>`);
      lc.set(`<span class="g">car</span><br><span class="m">${(8 * t).toFixed(2)} turns</span>`);
      $("#gr-turn-o").textContent = t.toFixed(2);
      $("#gr-read").innerHTML =
        `<dt>speeds</dt><dd>bicycle = 4 × man · car = 2 × bicycle</dd>` +
        `<dt class="c-grad">chain rule</dt><dd>d(car)/d(man) = d(car)/d(bike) × d(bike)/d(man) = 2 × 4 = 8</dd>` +
        `<dt>in the graph</dt><dd>dL/dc = dL/dd × dd/dc = (−2) × 1 = −2</dd>`;
      st.invalidate();
    }
    // keep the turn count in a variable: the slider rounds to 0.01, so reading it back
    // every frame would swallow the tiny per-frame steps
    let turns = 0, playing = false;
    sl.addEventListener("input", () => { playing = false; $("#gr-play").textContent = "▶ Spin"; turns = +sl.value; set(turns); });
    $("#gr-play").addEventListener("click", () => {
      playing = !playing;
      $("#gr-play").textContent = playing ? "■ Stop" : "▶ Spin";
      if (!playing) return;
      st.auto = false;
      let last = null;
      st.tick(now => {
        if (!playing) return false;
        if (last != null) { turns += (now - last) / 6000; if (turns > 2) turns -= 2; sl.value = turns; set(turns); }
        last = now;
        return true;
      });
    });
    set(0);
  });
});
