# Pictures: the library and the patterns

Every section needs a picture that proves something prose can't. Reuse these before inventing.
Every global below is available in page JS (one shared scope; no imports needed).

## Library parts (`ROOT/lib/js/`)

| Part | Use it for | Minimal use |
|---|---|---|
| `Stage` (three-stage.js) | any 3D scene: orbit, zoom, keyboard, theme colours, HTML labels, picking, dragging | `whenNear(host, () => { const st = new Stage(host, { dist: 12, autoRotate: true, label: "..." }); if (!st.ok) return; ... })` |
| `heightSurface(st, {x, z, fn, range, lo, hi, wire})` | a function of two inputs as a surface (loss landscapes, a×b, a neuron's output) | returns `{ mesh, update(fn) }`; call `update` when a slider changes |
| `contours(fn, x0, x1, z0, z1, n, levels, yOf)` | contour lines on the floor or the surface | `st.segments(contours(...), "--muted", .5)` |
| `st.sphere / st.arrow / st.tube / st.grid / st.label` | balls, gradient arrows, slices, floors, labels | `const up = st.arrow("--grad"); up.set(from, to)` |
| `st.addDrag(obj, ray => ...)` | something the learner drags in 3D | intersect `ray` with a surface, update state |
| `st.anim(ms, p => ...)` / `st.tick(fn)` | animations synced to the render loop | `await st.anim(500, p => ball.position.lerp...)` |
| `graph2D(svg, spec)` | expression graphs in the style of draw_dot: data and grad per node, op nodes | `setData`, `setGrad`, `flash`, `dot(edge, reverse, cls)`, `setMode("prev")` |
| `S`, `T`, `marker` | hand-drawn SVG plots | `S("circle", {cx, cy, r, class: "pt-data"}, svg)` |
| `tween`, `sleep`, `ease`, `clamp`, `lerp`, `py`, `fmtTime` | animation and number formatting | `py(x)` prints floats like Python |
| `DEMO.name = (...) => ...` | hooks the plan's actions call (`demo:name(...)`) | `DEMO.builderTo = n => { ... }` |

## Patterns from the reference page (`ROOT/examples/micrograd/src/js/`)

- **Slider plot with zoom** (12-deriv.js): a curve, a draggable point, a slider for a tiny
  quantity, and a zoom box that always frames it. A second plot collects the measured values into
  a new curve. *Proves: a limit and a derivative.*
- **3D surface with slices** (13-saddle.js): a draggable ball on `heightSurface`, slice lines
  through it, a gradient arrow on the floor, an optional tangent plane. *Proves: partial
  derivatives and the gradient.*
- **Landscape and descent** (10-landscape.js): click to drop a ball, step downhill, a step-size
  switch with a "too big" choice, contours. *Proves: gradient descent and the learning rate.*
- **Step-through builder** (14-graph2d.js): code lines on the left, an inspector of the new
  object's fields, the graph growing, an arrow-direction toggle. *Proves: how a data structure
  forms.*
- **Guess-the-rule game** (20-backprop.js): the learner picks the local rule at each node, wrong
  answers get a hint, then a numerical check. *Proves: they can do it themselves.*
- **Gears** (20-backprop.js): rates multiplying along a chain. *Proves: the chain rule.*
- **Live neuron** (22-neuron.js): sliders, a diagram with gradients, a tanh plot, and a 3D output
  surface. *Proves: what weights and bias do.*
- **Explainer for each rule** (23-ops.js): pick an operation, see its code with numbers filled in,
  and the backward flow animated.
- **Algorithm stepper** (24-topo.js): a recursion shown with stack, visited and output lists.
- **Bug toggle** (25-bug.js): the same run with the bug on and off, and the truth by nudging.
- **Live trainer** (30-train.js + 05-engine.js): a small engine trains in the browser, with a loss
  curve, predictions and a 3D network updating. A bug switch shows the classic mistake.

## Rules

- Keep state in variables, not in input elements. A slider's `step` rounds what you read back.
- Start loops through `PAGE.intro` and moment actions, not on load.
- 3D: `whenNear` before creating a `Stage`. Check `st.ok`. Give `label` for accessibility. Keep
  the camera far enough that nothing clips.
- Labels must not overlap lines. Put them above or below the line, with room.
- Test numbers your engine computes against the source (the example's engine tests reproduce
  Karpathy's gradients).
