// micrograd, rewritten in JavaScript rule for rule (engine.py + nn.py), so the page can
// build real expression graphs and train a real MLP in the browser.
class V {
  constructor(data, children, op, label) {
    this.data = data; this.grad = 0;
    this._prev = children || []; this._op = op || ""; this.label = label || "";
    this._backward = () => {};
  }
  static of(x) { return x instanceof V ? x : new V(x); }
  add(o) {
    o = V.of(o);
    const out = new V(this.data + o.data, [this, o], "+");
    out._backward = () => { this.grad += out.grad; o.grad += out.grad; };
    return out;
  }
  mul(o) {
    o = V.of(o);
    const out = new V(this.data * o.data, [this, o], "*");
    out._backward = () => { this.grad += o.data * out.grad; o.grad += this.data * out.grad; };
    return out;
  }
  pow(k) {
    const out = new V(this.data ** k, [this], "**" + k);
    out._backward = () => { this.grad += k * this.data ** (k - 1) * out.grad; };
    return out;
  }
  neg() { return this.mul(-1); }
  sub(o) { return this.add(V.of(o).neg()); }
  div(o) { return this.mul(V.of(o).pow(-1)); }
  exp() {
    const out = new V(Math.exp(this.data), [this], "exp");
    out._backward = () => { this.grad += out.data * out.grad; };
    return out;
  }
  tanh() {
    const t = Math.tanh(this.data), out = new V(t, [this], "tanh");
    out._backward = () => { this.grad += (1 - t * t) * out.grad; };
    return out;
  }
  topo() {
    const topo = [], seen = new Set();
    const build = v => { if (!seen.has(v)) { seen.add(v); v._prev.forEach(build); topo.push(v); } };
    build(this);
    return topo;
  }
  backward() {
    const topo = this.topo();
    this.grad = 1;
    for (let i = topo.length - 1; i >= 0; i--) topo[i]._backward();
  }
}
class Neuron {
  constructor(nin, rnd) { this.w = Array.from({ length: nin }, () => new V(rnd() * 2 - 1)); this.b = new V(rnd() * 2 - 1); }
  call(x) {
    let act = this.b;
    this.w.forEach((wi, i) => { act = act.add(wi.mul(x[i])); });  // sum((wi*xi ...), self.b)
    return act.tanh();
  }
  parameters() { return [...this.w, this.b]; }
}
class Layer {
  constructor(nin, nout, rnd) { this.neurons = Array.from({ length: nout }, () => new Neuron(nin, rnd)); }
  call(x) { return this.neurons.map(n => n.call(x)); }
  parameters() { return this.neurons.flatMap(n => n.parameters()); }
}
class MLP {
  constructor(nin, nouts, seed) {
    const rnd = rng(seed || 1), sz = [nin, ...nouts];
    this.sizes = sz;
    this.layers = nouts.map((_, i) => new Layer(sz[i], sz[i + 1], rnd));
  }
  // returns every layer's outputs as Values: acts[0] = inputs, acts[L] = outputs
  trace(x) {
    const acts = [x.map(v => V.of(v))];
    let cur = acts[0];
    this.layers.forEach(l => { cur = l.call(cur); acts.push(cur); });
    return acts;
  }
  call(x) { const out = this.trace(x).pop(); return out.length === 1 ? out[0] : out; }
  parameters() { return this.layers.flatMap(l => l.parameters()); }
}
// Karpathy's dataset (1:51:04)
const XS = [[2.0, 3.0, -1.0], [3.0, -1.0, 0.5], [0.5, 1.0, 1.0], [1.0, 1.0, -1.0]];
const YS = [1.0, -1.0, -1.0, 1.0];
