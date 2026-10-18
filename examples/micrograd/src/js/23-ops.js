// _backward for each operation: pick an op, set values, watch the local rule run.
safe("ops", () => {
  const svg = $("#op-svg");
  const mk = marker(svg, "op-mk");
  const ids = ["a", "b", "k", "g"];
  const sl = Object.fromEntries(ids.map(k => [k, $("#op-" + k)]));
  const outEl = k => sl[k].parentElement.querySelector("output");
  let op = "add";
  const unary = () => !(op === "add" || op === "mul");
  // drawing
  const box = (x, y, name) => {
    const g = S("g", { class: "rec" }, svg);
    S("rect", { x, y, width: 150, height: 44, rx: 4, class: "bx" }, g);
    T(g, x + 14, y + 27, name, "lab", "middle");
    S("line", { x1: x + 28, x2: x + 28, y1: y, y2: y + 44 }, g);
    const dt = T(g, x + 89, y + 18, "", "dat", "middle"), gt = T(g, x + 89, y + 35, "", "grd", "middle");
    return { g, dt, gt, x, y };
  };
  const A = box(14, 22, "a"), Bx = box(14, 122, "b"), O = box(396, 72, "out");
  const opG = S("g", { class: "opn" }, svg);
  S("circle", { cx: 280, cy: 94, r: 22 }, opG);
  const opT = T(opG, 280, 99, "+", "", "middle");
  const eA = S("path", { class: "edge", "marker-end": mk }, svg), eB = S("path", { class: "edge", "marker-end": mk }, svg);
  const eO = S("path", { d: "M302,94 L394,94", class: "edge", "marker-end": mk }, svg);
  const dotG = S("g", null, svg);
  const SYM = { add: "+", mul: "*", tanh: "tanh", exp: "exp", pow: "**k" };
  function vals() {
    const a = +sl.a.value, b = +sl.b.value, k = +sl.k.value, g = +sl.g.value;
    let out, la, lb = null, rule, ruleB = null;
    if (op === "add") { out = a + b; la = 1; lb = 1; rule = "1.0 * out.grad"; ruleB = "1.0 * out.grad"; }
    else if (op === "mul") { out = a * b; la = b; lb = a; rule = "other.data * out.grad"; ruleB = "self.data * out.grad"; }
    else if (op === "tanh") { out = Math.tanh(a); la = 1 - out * out; rule = "(1 - t**2) * out.grad"; }
    else if (op === "exp") { out = Math.exp(a); la = out; rule = "out.data * out.grad"; }
    else { out = a ** k; la = k * a ** (k - 1); rule = "other * self.data**(other-1) * out.grad"; }
    return { a, b, k, g, out, la, lb, rule, ruleB };
  }
  const num = v => (Number.isFinite(v) ? (+v.toFixed(4)).toString() : "∞ (undefined)");
  let shownGrads = null;
  function draw() {
    const v = vals();
    ids.forEach(k => { outEl(k).textContent = py(+sl[k].value); });
    $("#op-b-row").hidden = unary(); $("#op-k-row").hidden = op !== "pow";
    Bx.g.style.display = unary() ? "none" : "";
    eB.style.display = unary() ? "none" : "";
    const ya = unary() ? 94 : 44;
    A.g.setAttribute("transform", `translate(0,${unary() ? 50 : 0})`);
    eA.setAttribute("d", `M166,${ya} C220,${ya} 230,94 256,94`);
    eB.setAttribute("d", "M166,144 C220,144 230,94 256,94");
    opT.textContent = op === "pow" ? "**" + v.k : SYM[op];
    A.dt.textContent = "data " + num(v.a); Bx.dt.textContent = "data " + num(v.b);
    O.dt.textContent = "data " + num(v.out); O.gt.textContent = "grad " + num(v.g);
    const ga = shownGrads ? shownGrads.a : 0, gb = shownGrads ? shownGrads.b : 0;
    A.gt.textContent = "grad " + num(ga); Bx.gt.textContent = "grad " + num(gb);
    A.gt.classList.toggle("zero", !shownGrads); Bx.gt.classList.toggle("zero", !shownGrads);
    // code
    const c = (s, x) => `${s.padEnd(Math.max(44, s.length + 2))}<span class="cm"># ${x}</span>`;
    let lines;
    if (op === "add" || op === "mul") {
      const sy = op === "add" ? "+" : "*", meth = op === "add" ? "__add__" : "__mul__";
      lines = [
        `def ${meth}(self, other):`,
        c(`    out = Value(self.data ${sy} other.data, (self, other), '${sy}')`, `${num(v.a)} ${sy} ${num(v.b)} = ${num(v.out)}`),
        `    def _backward():`,
        c(`        self.grad  += ${v.rule}`, `${num(v.la)} × ${num(v.g)} = ${num(v.la * v.g)}`),
        c(`        other.grad += ${v.ruleB}`, `${num(v.lb)} × ${num(v.g)} = ${num(v.lb * v.g)}`),
        `    out._backward = _backward`, `    return out`
      ];
    } else if (op === "tanh") {
      lines = [`def tanh(self):`, `    x = self.data`, c(`    t = (math.exp(2*x) - 1)/(math.exp(2*x) + 1)`, `tanh(${num(v.a)}) = ${num(v.out)}`),
        `    out = Value(t, (self, ), 'tanh')`, `    def _backward():`, c(`        self.grad += ${v.rule}`, `(1 - ${num(v.out)}²) × ${num(v.g)} = ${num(v.la * v.g)}`),
        `    out._backward = _backward`, `    return out`];
    } else if (op === "exp") {
      lines = [`def exp(self):`, `    x = self.data`, c(`    out = Value(math.exp(x), (self, ), 'exp')`, `e^${num(v.a)} = ${num(v.out)}`),
        `    def _backward():`, c(`        self.grad += ${v.rule}`, `${num(v.out)} × ${num(v.g)} = ${num(v.la * v.g)}`),
        `    out._backward = _backward`, `    return out`];
    } else {
      lines = [`def __pow__(self, other):    # other = k = ${v.k}`, `    assert isinstance(other, (int, float))`,
        c(`    out = Value(self.data**other, (self,), f'**{other}')`, `${num(v.a)}^${v.k} = ${num(v.out)}`),
        `    def _backward():`, c(`        self.grad += ${v.rule}`, `${v.k} × ${num(v.a)}^${v.k - 1} × ${num(v.g)} = ${num(v.la * v.g)}`),
        `    out._backward = _backward`, `    return out`];
    }
    $("#op-code").innerHTML = lines.map(l => `<div>${l}</div>`).join("");
  }
  $$("#op-seg button").forEach(b => b.addEventListener("click", () => {
    op = b.dataset.op; shownGrads = null;
    $$("#op-seg button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    draw();
  }));
  ids.forEach(k => sl[k].addEventListener("input", () => { shownGrads = null; draw(); }));
  async function along(path, rev) {
    if (RM) return;
    const len = path.getTotalLength(), c = S("circle", { r: 5, class: "dot-b" }, dotG);
    await tween(450, u => { const p = path.getPointAtLength((rev ? 1 - u : u) * len); c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); });
    c.remove();
  }
  let busy = false;
  $("#op-run").addEventListener("click", async () => {
    if (busy) return; busy = true;
    shownGrads = null; draw();
    await along(eO, true);
    await Promise.all(unary() ? [along(eA, true)] : [along(eA, true), along(eB, true)]);
    const v = vals();
    shownGrads = { a: v.la * v.g, b: v.lb == null ? 0 : v.lb * v.g };
    draw();
    [A.g, Bx.g].forEach(g => { g.classList.add("hlg"); setTimeout(() => g.classList.remove("hlg"), 900); });
    busy = false;
  });
  draw();
});
