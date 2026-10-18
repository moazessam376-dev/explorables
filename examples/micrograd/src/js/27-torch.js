// Scalars vs tensors: a grid of cubes, one cube per number (1:39:31).
safe("tensor", () => {
  const ids = ["r", "c", "d"];
  const sl = Object.fromEntries(ids.map(k => [k, $("#tn-" + k)]));
  const outEl = k => sl[k].parentElement.querySelector("output");
  const subs = [];
  function read() {
    const r = +sl.r.value, c = +sl.c.value, d = +sl.d.value, n = r * c * d;
    ids.forEach(k => { outEl(k).textContent = sl[k].value; });
    const shape = d > 1 ? `(${d}, ${r}, ${c})` : r > 1 || c > 1 ? `(${r}, ${c})` : "(1,)";
    $("#tn-read").innerHTML =
      `<dt>PyTorch</dt><dd>a tensor of shape ${shape}: ${n} number${n > 1 ? "s" : ""} in one object</dd>` +
      `<dt>micrograd</dt><dd>${n} separate <code>Value</code> object${n > 1 ? "s" : ""}, handled one at a time</dd>` +
      `<dt>the math</dt><dd>identical for every number; PyTorch just does them all in parallel</dd>`;
    subs.forEach(f => f(r, c, d));
  }
  ids.forEach(k => sl[k].addEventListener("input", read));
  DEMO.tensor = (r, c, d) => { sl.r.value = r; sl.c.value = c; sl.d.value = d; read(); };
  read();
  const host = $("#tensor3d");
  whenNear(host, () => {
    const st = new Stage(host, { dist: 11, theta: 0.7, phi: 1.0, target: [0, 0, 0], autoRotate: true, label: "A tensor as a block of cubes" });
    if (!st.ok) return;
    const MAX = 216, geo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
    const mesh = new THREE.InstancedMesh(geo, st.mat("--data", { roughness: 0.4 }), MAX);
    st.scene.add(mesh);
    const edges = new THREE.LineSegments(new THREE.BufferGeometry(), st.lineMat("--ink", 0.35));
    st.scene.add(edges);
    const tag = st.label("", "tag");
    const m = new THREE.Matrix4();
    subs.push((r, c, d) => {
      let i = 0;
      const pts = [], e = new THREE.EdgesGeometry(geo).attributes.position.array;
      for (let z = 0; z < d; z++) for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) {
        const px = x - (c - 1) / 2, py_ = (r - 1) / 2 - y, pz = z - (d - 1) / 2;
        m.makeTranslation(px, py_, pz); mesh.setMatrixAt(i++, m);
        for (let k = 0; k < e.length; k += 3) pts.push(e[k] + px, e[k + 1] + py_, e[k + 2] + pz);
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true;
      edges.geometry.dispose(); edges.geometry = new THREE.BufferGeometry();
      edges.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      tag.pos.set(0, r / 2 + 0.7, 0);
      tag.set(i === 1 ? "one number: like one micrograd Value" : `${i} numbers, one tensor`);
      st.dist = 6 + Math.max(r, c, d) * 1.6; st.invalidate();
    });
    read();
  });
});
