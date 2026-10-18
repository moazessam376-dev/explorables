// One optimization step on the 3D L graph (51:10).
safe("step", () => {
  const host = $("#g3-step");
  const lr = $("#stp-lr"), pr = $("#stp-print");
  lr.addEventListener("input", () => { $("#stp-lr-o").textContent = py(+lr.value); });
  whenNear(host, () => {
    const G = graph3D(host, {});
    if (!G) return;
    const hist = [];
    const fmt = v => py(+v.toFixed(6));
    function resetAll() {
      G.leaves = { a: 2, b: -3, c: 10, f: -2 }; G.fwd = true; G.bwd = true; G.show();
      hist.length = 0;
      hist.push(`L = ${py(G.values().L)}    # start: a=2.0 b=-3.0 c=10.0 f=-2.0`);
      pr.textContent = hist.join("\n");
    }
    function step(sign) {
      const g = G.grads(), s = +lr.value;
      ["a", "b", "c", "f"].forEach(k => { G.leaves[k] += sign * s * g[k]; });
      G.show();
      const v = G.values();
      hist.push(`${sign > 0 ? "+=" : "-="} ${s} * grad  →  a=${fmt(v.a)} b=${fmt(v.b)} c=${fmt(v.c)} f=${fmt(v.f)}  →  L = ${py(v.L)}`);
      if (hist.length > 9) hist.splice(1, 1);
      pr.textContent = hist.join("\n");
    }
    $("#stp-up").addEventListener("click", () => step(+1));
    $("#stp-down").addEventListener("click", () => step(-1));
    $("#stp-reset").addEventListener("click", resetAll);
    resetAll();
  });
});
