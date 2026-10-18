import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCourseHome, validateCourse } from "../tools/course.mjs";

const course = () => ({
  id: "zero-to-hero", title: "Neural Networks: Zero to Hero",
  source: { provider: "youtube", playlist: "PLx" },
  parts: [
    { id: "01-micrograd", title: "micrograd", status: "done", page: "01-micrograd/index.html", notes: "chain rule clicked" },
    { id: "02-makemore", title: "makemore: bigram", status: "page-ready", page: "02-makemore/index.html" },
    { id: "03-mlp", title: "<b>MLP</b>", status: "not-started" }
  ],
  current: "02-makemore"
});

test("one row per part, in order, with a status chip", () => {
  const html = renderCourseHome(course());
  const rows = [...html.matchAll(/<li class="part[^"]*" data-part="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(rows, ["01-micrograd", "02-makemore", "03-mlp"]);
  assert.match(html, /class="chip done"/);
  assert.match(html, /class="chip page-ready"/);
  assert.match(html, /class="chip not-started"/);
});

test("done and ready parts link to their pages; not-started parts don't", () => {
  const html = renderCourseHome(course());
  assert.match(html, /href="01-micrograd\/index.html"/);
  assert.match(html, /href="02-makemore\/index.html"/);
  const notStarted = html.split('data-part="03-mlp"')[1].split("</li>")[0];
  assert.doesNotMatch(notStarted, /<a /);
});

test("the current part is highlighted", () => {
  assert.match(renderCourseHome(course()), /<li class="part current" data-part="02-makemore"/);
});

test("titles are escaped", () => {
  const html = renderCourseHome(course());
  assert.match(html, /&lt;b&gt;MLP&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>MLP<\/b>/);
});

test("an unknown status is an error", () => {
  const c = course(); c.parts[0].status = "halfway";
  assert.ok(validateCourse(c).some(m => m.includes("halfway")));
  assert.throws(() => renderCourseHome(c));
});

test("the course home shares the course's saved theme with its pages", () => {
  const c = course(); c.theme = "chalk";
  const html = renderCourseHome(c);
  assert.match(html, /"explorables:zero-to-hero:skin"/);
  assert.match(html, /"chalk"/);
});

test("the home page has a title, the theme picker and no follow bar", () => {
  const html = renderCourseHome(course());
  assert.ok(html.startsWith("<title>Neural Networks: Zero to Hero</title>"));
  assert.match(html, /id="skin"/);
  assert.doesNotMatch(html, /id="fl-play"/);
});
