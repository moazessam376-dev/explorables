// Building tanh from exp, +, -, ** and *: same forward value, same gradients (1:27:05).
safe("tanh-break", () => {
  const svg = $("#th-svg");
  function build(mode) {
    const x1 = new V(2), x2 = new V(0), w1 = new V(-3), w2 = new V(1), b = new V(NEURON_B);
    const n = x1.mul(w1).add(x2.mul(w2)).add(b);
    let o, m = { n };
    if (mode === "one") { o = n.tanh(); m.o = o; }
    else {
      const n2 = n.mul(2), e = n2.exp(), em1 = e.sub(1), ep1 = e.add(1), inv = ep1.pow(-1);
      o = em1.mul(inv);
      Object.assign(m, { n2, e, em1, ep1, inv, o });
    }
    o.backward();
    return { m, o, leaves: { x1, w1, x2, w2, b }, count: o.topo().length };
  }
  const one = build("one"), many = build("many");
  const SPEC = {
    one: {
      vb: "0 0 490 110",
      nodes: { n: { x: 8, y: 40 }, o: { x: 270, y: 40 } },
      ops: { t: { sym: "tanh", cx: 245, cy: 55, ins: ["n"], out: "o" } }
    },
    many: {
      vb: "0 0 1478 160",
      nodes: { n: { x: 8, y: 60 }, n2: { label: "2*n", x: 258, y: 60 }, e: { x: 508, y: 60 }, em1: { label: "e-1", x: 758, y: 10 },
        ep1: { label: "e+1", x: 758, y: 110 }, inv: { label: "1/(e+1)", x: 1008, y: 110 }, o: { x: 1258, y: 60 } },
      ops: {
        m2: { sym: "*2", cx: 238, cy: 75, ins: ["n"], out: "n2" }, ex: { sym: "exp", cx: 488, cy: 75, ins: ["n2"], out: "e" },
        s1: { sym: "-1", cx: 738, cy: 25, ins: ["e"], out: "em1" }, a1: { sym: "+1", cx: 738, cy: 125, ins: ["e"], out: "ep1" },
        pw: { sym: "**-1", cx: 988, cy: 125, ins: ["ep1"], out: "inv" }, mm: { sym: "*", cx: 1238, cy: 75, ins: ["em1", "inv"], out: "o" }
      }
    }
  };
  function draw(mode) {
    svg.innerHTML = "";
    const sp = SPEC[mode], R = mode === "one" ? one : many;
    svg.setAttribute("viewBox", sp.vb);
    svg.style.minWidth = mode === "one" ? "360px" : "820px";
    const G = graph2D(svg, { prefix: "th" + mode, labW: 56, cellW: 78, nodes: sp.nodes, ops: sp.ops });
    for (const id in G.N) { G.setData(id, R.m[id].data); G.setGrad(id, R.m[id].grad); }
    const L = (r, k) => py(+r.leaves[k].grad.toFixed(12));
    $("#th-read").innerHTML =
      `<dt>nodes in graph</dt><dd>one tanh: ${one.count} · from exp: ${many.count}</dd>` +
      `<dt class="c-data">o</dt><dd>one tanh: ${py(+one.o.data.toFixed(12))} · from exp: ${py(+many.o.data.toFixed(12))}</dd>` +
      ["x1", "w1", "x2", "w2", "b"].map(k => `<dt class="c-grad">${k}.grad</dt><dd>one tanh: ${L(one, k)} · from exp: ${L(many, k)}</dd>`).join("");
  }
  $$("#th-seg button").forEach(b => b.addEventListener("click", () => {
    $$("#th-seg button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    draw(b.dataset.m);
  }));
  draw("one");

  // 2 * a and __rmul__
  const STEPS = [
    `<span class="k">&gt;&gt;&gt;</span> a = Value(2.0)\n<span class="k">&gt;&gt;&gt;</span> 2 * a`,
    `<span class="k"># 1. Python asks the left side first:</span>\n(2).__mul__(a)\n<span class="k"># a plain int doesn't know what a Value is → NotImplemented</span>`,
    `<span class="k"># 2. Instead of giving up, Python asks the right side:</span>\na.__rmul__(2)`,
    `<span class="k"># 3. Karpathy's __rmul__ just swaps the order:</span>\ndef __rmul__(self, other):   <span class="k"># other * self</span>\n    return self * other      <span class="k"># → a.__mul__(2), which wraps 2 in Value(2.0)</span>`,
    `<span class="k"># 4. The answer:</span>\nValue(data=4.0)`
  ];
  let i = 0;
  const out = $("#rm-out");
  const show = () => { out.innerHTML = STEPS.slice(0, i + 1).join("\n\n"); $("#rm-next").disabled = i >= STEPS.length - 1; };
  $("#rm-next").addEventListener("click", () => { if (i < STEPS.length - 1) { i++; show(); } });
  $("#rm-reset").addEventListener("click", () => { i = 0; show(); });
  show();
});
