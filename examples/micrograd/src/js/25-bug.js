// The "used twice" bug: = overwrites, += accumulates (1:22:28).
safe("bug", () => {
  const G = graph2D($("#g-bug"), {
    prefix: "bug", labW: 26, cellW: 82,
    nodes: {
      a: { data: -2, x: 8, y: 10 }, b: { data: 3, x: 8, y: 92 },
      d: { data: -6, x: 254, y: 10 }, e: { data: 1, x: 254, y: 92 },
      f: { data: -6, x: 500, y: 52 }
    },
    ops: {
      m1: { sym: "*", cx: 226, cy: 34, ins: ["a", "b"], out: "d" },
      a1: { sym: "+", cx: 226, cy: 98, ins: ["a", "b"], out: "e" },
      m2: { sym: "*", cx: 472, cy: 67, ins: ["d", "e"], out: "f" }
    }
  });
  let mode = "set", busy = false;
  const log = $("#bug-log"), res = $("#bug-res");
  const clear = () => { G.fill(id => G.N[id].data, () => 0); log.innerHTML = '<span class="k"># press Run backward()</span>'; res.innerHTML = ""; };
  $$("#bug-seg button").forEach(b => b.addEventListener("click", () => {
    if (busy) return;
    mode = b.dataset.m;
    $$("#bug-seg button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    clear();
  }));
  const op = () => (mode === "set" ? "=" : "+=");
  $("#bug-run").addEventListener("click", async () => {
    if (busy) return; busy = true; clear();
    const g = { a: 0, b: 0, d: 0, e: 0, f: 1 };
    const put = (id, v) => { g[id] = mode === "set" ? v : g[id] + v; G.setGrad(id, g[id]); G.flash(id, "hlg"); };
    const say = s => { log.innerHTML += s + "\n"; };
    log.innerHTML = "";
    G.setGrad("f", 1); say("f.grad = 1.0"); await sleep(500);
    await G.dot("m2>f", true, "dot-b");
    await Promise.all([G.dot("d>m2", true, "dot-b"), G.dot("e>m2", true, "dot-b")]);
    put("d", 1 * 1); put("e", -6 * 1);
    say(`f._backward():  d.grad ${op()} e.data * f.grad = 1.0     e.grad ${op()} d.data * f.grad = -6.0`);
    await sleep(700);
    await G.dot("a1>e", true, "dot-b");
    await Promise.all([G.dot("a>a1", true, "dot-b"), G.dot("b>a1", true, "dot-b")]);
    put("a", 1 * g.e); put("b", 1 * g.e);
    say(`e._backward():  a.grad ${op()} 1.0 * e.grad  → a.grad = ${py(g.a)}     b.grad ${op()} 1.0 * e.grad  → b.grad = ${py(g.b)}`);
    await sleep(900);
    await G.dot("m1>d", true, "dot-b");
    await Promise.all([G.dot("a>m1", true, "dot-b"), G.dot("b>m1", true, "dot-b")]);
    const ba = g.a, bb = g.b;
    put("a", 3 * g.d); put("b", -2 * g.d);
    say(`d._backward():  a.grad ${op()} b.data * d.grad  → a.grad = ${py(g.a)}${mode === "set" ? `   (the ${py(ba)} from e is lost!)` : `   (${py(ba)} + 3.0)`}`);
    say(`                b.grad ${op()} a.data * d.grad  → b.grad = ${py(g.b)}${mode === "set" ? `   (the ${py(bb)} from e is lost!)` : `   (${py(bb)} + -2.0)`}`);
    // the truth, by nudging a and b (numerical gradient)
    const h = 1e-6, F = (a, b) => (a * b) * (a + b);
    const ta = (F(-2 + h, 3) - F(-2, 3)) / h, tb = (F(-2, 3 + h) - F(-2, 3)) / h;
    res.innerHTML =
      `<dt>${mode === "set" ? "with =" : "with +="}</dt><dd>a.grad = ${py(g.a)}, b.grad = ${py(g.b)}</dd>` +
      `<dt>by nudging</dt><dd>a ≈ ${ta.toFixed(4)}, b ≈ ${tb.toFixed(4)}</dd>` +
      `<dt>verdict</dt><dd>${mode === "set" ? '<b class="c-neg">wrong</b>: each value got two deliveries, and the second replaced the first' : '<b class="c-ok">correct</b>: both deliveries were added up'}</dd>`;
    busy = false;
  });
  clear();
});
