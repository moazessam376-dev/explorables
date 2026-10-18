// A page's plan.json: what the page covers, where each moment points, what pictures act out.
// validatePlan lists problems (empty = valid); pageConfig turns it into the PAGE object pages read.

export const THEMES = ["auto", "field-light", "field-dark", "chalk", "notebook-light", "notebook-dark", "manim"];
export const ANCHOR_RE =/^(head|fig|fig2|why|words|py|means(:\d+)?|#.+)$/;

export function validatePlan(plan) {
  const out = [];
  const isVideo = plan?.source?.kind === "video";
  if (!plan || typeof plan !== "object") return ["plan is not an object"];
  if (!plan.id) out.push("plan.id is missing");
  if (!plan.title) out.push("plan.title is missing");
  if (!plan.source || !["video", "text"].includes(plan.source.kind)) out.push('source.kind must be "video" or "text"');
  if (isVideo && !(plan.source.duration > 0)) out.push("source.duration must be a positive number of seconds");
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  if (!sections.length) out.push("plan has no sections");
  const ids = new Set();
  let lastT = -1;
  for (const s of sections) {
    if (!s.id) { out.push("a section has no id"); continue; }
    if (ids.has(s.id)) out.push(`duplicate section id ${s.id}`);
    ids.add(s.id);
    if (!Array.isArray(s.pictures) || !s.pictures.length) out.push(`section ${s.id} has no pictures (every section needs at least one)`);
    for (const m of s.moments || []) {
      if (m.anchor != null && !ANCHOR_RE.test(m.anchor)) out.push(`moment ${m.t ?? m.page} in ${s.id}: anchor "${m.anchor}" is not head|fig|fig2|why|words|py|means|means:N|#selector`);
      if (m.action != null && !Array.isArray(m.action)) out.push(`moment ${m.t ?? m.page} in ${s.id}: action must be a list of steps`);
      if (isVideo) {
        if (!(typeof m.t === "number")) { out.push(`moment in ${s.id} has no time t`); continue; }
        if (m.t < lastT) out.push(`moment ${m.t} in ${s.id} is earlier than the moment before it (${lastT})`);
        if (m.t > plan.source.duration) out.push(`moment ${m.t} in ${s.id} is past the end (${plan.source.duration})`);
        lastT = Math.max(lastT, m.t);
      } else if (m.page == null && m.t == null) out.push(`landmark in ${s.id} needs a page (or t)`);
    }
    for (const c of chaptersOf(s)) if (isVideo && !(c[0] >= 0 && c[0] <= plan.source.duration)) out.push(`chapter ${c[0]} of ${s.id} is outside the video`);
  }
  for (const id of plan.mustRead || []) if (!ids.has(id)) out.push(`mustRead ${id} is not a section`);
  if (plan.theme != null && !THEMES.includes(plan.theme)) out.push(`theme "${plan.theme}" is not one of ${THEMES.join(", ")}`);
  return out;
}

// a section names one lecture chapter (`chapter: [t, title]`) or several (`chapters: [[t, title], ...]`)
const chaptersOf = s => (s.chapters || (s.chapter ? [s.chapter] : []));

export function pageConfig(plan) {
  const chapters = [], anchors = {}, actions = {};
  for (const s of plan.sections) {
    for (const c of chaptersOf(s)) chapters.push([c[0], c[1], s.id]);
    for (const m of s.moments || []) {
      if (m.t == null) continue;
      if (m.anchor) anchors[m.t] = m.anchor;
      if (m.action) actions[m.t] = m.action;
    }
  }
  chapters.sort((a, b) => a[0] - b[0]);
  return {
    id: plan.id, title: plan.title, subtitle: plan.subtitle || "",
    // the learner's theme (from their profile) and the course, which shares one saved theme pick
    theme: plan.theme || "auto", course: plan.course || plan.id,
    source: plan.source, refs: plan.refs || {},
    chapters, anchors, actions,
    intro: plan.intro || {}, mustRead: plan.mustRead || []
  };
}
