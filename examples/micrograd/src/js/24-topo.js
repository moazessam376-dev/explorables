// Topological sort: build_topo on Karpathy's neuron, then backward in reversed order.
safe("topo", () => {
  const G = graph2D($("#g-topo"), NEURON_SPEC("tp"));
  const KIDS = { o: ["n"], n: ["s", "b"], s: ["x1w1", "x2w2"], x1w1: ["x1", "w1"], x2w2: ["x2", "w2"], x1: [], w1: [], x2: [], w2: [], b: [] };
  const LBL = id => G.N[id].label;
  // record every step of the recursion
  const steps = [];
  (function simulate() {
    const visited = [], topo = [], stack = [];
    const snap = (extra) => steps.push(Object.assign({ visited: visited.slice(), topo: topo.slice(), stack: stack.slice(), phase: 1 }, extra));
    function build(v) {
      if (visited.includes(v)) return;
      visited.push(v); stack.push(v);
      snap({ cur: v, say: KIDS[v].length ? `build_topo(${LBL(v)}): new node, mark it visited, then visit its children: ${KIDS[v].map(LBL).join(", ")}` : `build_topo(${LBL(v)}): new node, mark it visited. It's a leaf: no children.` });
      KIDS[v].forEach(build);
      topo.push(v); stack.pop();
      snap({ cur: v, added: v, say: `all children of ${LBL(v)} are in the list, so append ${LBL(v)}   →   topo.append(${LBL(v)})` });
    }
    build("o");
    const order = topo.slice().reverse(), grads = { o: 1 };
    steps.push({ visited: visited.slice(), topo: topo.slice(), stack: [], phase: 2, grads: Object.assign({}, grads), cur: "o", say: "Phase 2. o.grad = 1.0, then: for node in reversed(topo): node._backward()" });
    order.forEach(v => {
      KIDS[v].forEach(ch => { grads[ch] = G.N[ch].grad; });
      steps.push({ visited: visited.slice(), topo: topo.slice(), stack: [], phase: 2, grads: Object.assign({}, grads), cur: v, filled: KIDS[v],
        say: KIDS[v].length ? `${LBL(v)}._backward(): pushes its gradient into ${KIDS[v].map(LBL).join(" and ")}` : `${LBL(v)}._backward(): a leaf, nothing to do` });
    });
  })();
  let s = -1, timer = null;
  const chips = (arr, fresh) => arr.map(id => `<span class="chip${id === fresh ? " new" : ""}">${LBL(id)}</span>`).join("");
  function render() {
    const st = steps[s] || { visited: [], topo: [], stack: [], phase: 1, say: "Press Next step to run build_topo(o)." };
    G.clearMarks("vis", "done", "sel");
    for (const id in G.N) {
      G.setData(id, G.N[id].data);
      G.setGrad(id, st.phase === 2 && st.grads[id] != null ? st.grads[id] : 0);
      if (st.phase === 1) { if (st.topo.includes(id)) G.mark(id, "done", true); else if (st.visited.includes(id)) G.mark(id, "vis", true); }
    }
    if (st.cur) G.mark(st.cur, "sel", true);
    if (st.phase === 2 && st.filled) st.filled.forEach(id => G.flash(id, "hlg"));
    $("#tp-stack").innerHTML = "<b>calls in progress</b>" + chips(st.stack, null);
    $("#tp-visited").innerHTML = "<b>visited</b>" + chips(st.visited, null);
    $("#tp-topo").innerHTML = "<b>topo (the order)</b>" + chips(st.topo, st.added);
    $("#tp-say").textContent = st.say;
    $("#tp-count").textContent = (s + 1) + " / " + steps.length;
    $("#tp-step").disabled = s >= steps.length - 1;
  }
  const stop = () => { clearInterval(timer); timer = null; $("#tp-play").textContent = "▶ Play"; };
  $("#tp-step").addEventListener("click", () => { stop(); if (s < steps.length - 1) { s++; render(); } });
  $("#tp-reset").addEventListener("click", () => { stop(); s = -1; render(); });
  $("#tp-play").addEventListener("click", () => {
    if (timer) { stop(); return; }
    if (s >= steps.length - 1) s = -1;
    $("#tp-play").textContent = "■ Pause";
    timer = setInterval(() => { if (s >= steps.length - 1) { stop(); return; } s++; render(); }, RM ? 400 : 1100);
  });
  render();
});
