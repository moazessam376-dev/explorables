// Karpathy's graphs and the Value builder; graph2D itself lives in the lib.
// Karpathy's L graph (28:01): L = (a*b + c) * f
function L_SPEC(prefix) {
  return {
    prefix, labW: 26, cellW: 82,
    nodes: {
      a: { data: 2, grad: 6, x: 8, y: 10 }, b: { data: -3, grad: -4, x: 8, y: 60 },
      e: { data: -6, grad: -2, x: 254, y: 35 }, c: { data: 10, grad: -2, x: 254, y: 95 },
      d: { data: 4, grad: -2, x: 500, y: 65 }, f: { data: -2, grad: 4, x: 500, y: 125 },
      L: { data: -8, grad: 1, x: 746, y: 95 }
    },
    ops: {
      op1: { sym: "*", cx: 226, cy: 50, ins: ["a", "b"], out: "e" },
      op2: { sym: "+", cx: 472, cy: 80, ins: ["e", "c"], out: "d" },
      op3: { sym: "*", cx: 718, cy: 110, ins: ["d", "f"], out: "L" }
    }
  };
}
// Karpathy's neuron (52:52): o = tanh(x1*w1 + x2*w2 + b)
const NEURON_B = 6.8813735870195432;
function NEURON_SPEC(prefix) {
  const col = [8, 298, 588, 878, 1168];
  return {
    prefix, labW: 70, cellW: 82,
    nodes: {
      x1: { data: 2, grad: -1.5, x: col[0], y: 10 }, w1: { data: -3, grad: 1, x: col[0], y: 55 },
      x2: { data: 0, grad: 0.5, x: col[0], y: 110 }, w2: { data: 1, grad: 0, x: col[0], y: 155 },
      x1w1: { label: "x1*w1", data: -6, grad: 0.5, x: col[1], y: 32.5 }, x2w2: { label: "x2*w2", data: 0, grad: 0.5, x: col[1], y: 132.5 },
      s: { label: "x1w1+x2w2", data: -6, grad: 0.5, x: col[2], y: 82.5 }, b: { data: NEURON_B, grad: 0.5, x: col[2], y: 150 },
      n: { data: NEURON_B - 6, grad: 0.5, x: col[3], y: 116.25 }, o: { data: Math.tanh(NEURON_B - 6), grad: 1, x: col[4], y: 116.25 }
    },
    ops: {
      m1: { sym: "*", cx: 270, cy: 47.5, ins: ["x1", "w1"], out: "x1w1" },
      m2: { sym: "*", cx: 270, cy: 147.5, ins: ["x2", "w2"], out: "x2w2" },
      a1: { sym: "+", cx: 560, cy: 97.5, ins: ["x1w1", "x2w2"], out: "s" },
      a2: { sym: "+", cx: 850, cy: 131.25, ins: ["s", "b"], out: "n" },
      t: { sym: "tanh", cx: 1140, cy: 131.25, ins: ["n"], out: "o" }
    }
  };
}

// ---------- Value builder (19:09 – 32:10) ----------
safe("builder", () => {
  const G = graph2D($("#g-build"), L_SPEC("bd"));
  const CODE = [
    "a = Value(2.0, label='a')",
    "b = Value(-3.0, label='b')",
    "c = Value(10.0, label='c')",
    "e = a*b; e.label = 'e'",
    "d = e + c; d.label = 'd'",
    "f = Value(-2.0, label='f')",
    "L = d * f; L.label = 'L'"
  ];
  const code = $("#b-code");
  CODE.forEach(l => { const dv = document.createElement("div"); dv.textContent = l; code.appendChild(dv); });
  const lines = $$("div", code);
  const leaf = (id, v, note) => ({
    node: id,
    insp: [["data", py(v), "given directly"], ["grad", "0.0", "no effect known yet"], ["_prev", "set()", "a leaf has no inputs"], ["_op", "''", "not made by an operation"], ["label", `'${id}'`, ""]],
    py: `${id} = Value(${py(v)}, label='${id}')    # Python runs Value.__init__ for the new object`,
    note: note || "Another leaf: made directly, so no children and no op."
  });
  const STEPS = [
    { node: null, py: "# nothing run yet", note: "Press “Run next line”. The faint boxes show where each Value will appear." },
    leaf("a", 2, "A leaf: made directly with Value(...), not by an operation. So it has no children (_prev is empty) and no op."),
    leaf("b", -3), leaf("c", 10),
    { node: "e", op: "op1", insp: [["data", "-6.0", "a.data * b.data = 2.0 * -3.0"], ["grad", "0.0", ""], ["_prev", "{a, b}", "its children: the inputs"], ["_op", "'*'", ""], ["label", "'e'", ""]],
      py: "e = a.__mul__(b)    # what Python really runs for a*b", note: "Python sees a*b and calls a.__mul__(b). That returns a brand-new Value, which remembers a and b as its children." },
    { node: "d", op: "op2", insp: [["data", "4.0", "e.data + c.data = -6.0 + 10.0"], ["grad", "0.0", ""], ["_prev", "{e, c}", ""], ["_op", "'+'", ""], ["label", "'d'", ""]],
      py: "d = e.__add__(c)    # what Python really runs for e + c", note: "Same idea for +. The new Value d points back at e and c." },
    leaf("f", -2),
    { node: "L", op: "op3", insp: [["data", "-8.0", "d.data * f.data = 4.0 * -2.0"], ["grad", "0.0", "will be 1.0: dL/dL = 1 (29:46)"], ["_prev", "{d, f}", ""], ["_op", "'*'", ""], ["label", "'L'", ""]],
      py: "L = d.__mul__(f)    # the output of the whole expression", note: "That's the forward pass: every value computed, left to right. L = −8." },
    { node: null, final: true, py: "draw_dot(L)    # 28:36", note: "Every Value now knows its inputs. Flip the arrows to “what _prev points to”: following them from L is exactly the walk backpropagation does at 32:10." }
  ];
  let s = 0;
  function render(animate) {
    const st = STEPS[s], shown = new Set(), ops = new Set();
    for (let i = 1; i <= s; i++) { if (STEPS[i].node) shown.add(STEPS[i].node); if (STEPS[i].op) ops.add(STEPS[i].op); }
    for (const id in G.N) { G.ghost(id, !shown.has(id)); G.setData(id, shown.has(id) ? G.N[id].data : null); G.setGrad(id, 0); }
    for (const id in G.OPS) G.ghostOp(id, !ops.has(id));
    if (st.node) G.flash(st.node, "hl");
    if (animate && st.op && mode === "flow") G.drawIn(st.op);
    lines.forEach((l, i) => { l.className = ""; if (st.node && i === s - 1) l.className = "cur"; else if (i < Math.min(s, CODE.length)) l.className = "done"; });
    const insp = $("#b-insp");
    if (st.insp) {
      insp.innerHTML = `<span class="cm"># inside the new Value</span>\n` + st.insp.map(([k, v, c]) =>
        `${k.padEnd(6)}= <b>${v}</b>${c ? `   <span class="cm"># ${c}</span>` : ""}`).join("\n");
    } else if (st.final) {
      insp.innerHTML = `<span class="cm"># the whole expression</span>\nL = (a*b + c) * f\n  = (2.0 * -3.0 + 10.0) * -2.0\n  = <b>-8.0</b>\n\n<span class="cm"># every grad is still 0.0</span>`;
    } else {
      insp.innerHTML = `<span class="cm"># the stored fields of each new Value\n# will appear here</span>`;
    }
    $("#b-py").textContent = st.py;
    $("#b-note").textContent = st.note;
    $("#b-count").textContent = s + " / " + (STEPS.length - 1);
    $("#b-back").disabled = s === 0;
    $("#b-next").textContent = s === STEPS.length - 1 ? "Start over" : "Run next line →";
  }
  let mode = "flow";
  $$("#b-mode button").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.m;
    $$("#b-mode button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    G.setMode(mode);
  }));
  DEMO.builderTo = n => { s = clamp(n, 0, STEPS.length - 1); render(true); };
  $("#b-next").addEventListener("click", () => { s = s === STEPS.length - 1 ? 0 : s + 1; render(true); });
  $("#b-back").addEventListener("click", () => { if (s > 0) { s--; render(false); } });
  render(false);
});
