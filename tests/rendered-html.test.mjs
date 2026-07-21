import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Gaudeamus Mentor landing page and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Gaudeamus Mentor — Učenje koje ostaje<\/title>/i);
  assert.match(html, /GAUDEAMUS/);
  assert.match(html, /Učenje koje ostaje/i);
  assert.match(html, /href="\/pronadi-profesora"/);
  assert.match(html, /href="\/predmeti"/);
  assert.match(html, /<select name="subject"[^>]*>/i);
  assert.match(html, /<option value="matematika" selected="">Matematika<\/option>/i);
  assert.match(html, /<select name="level"[^>]*>/i);
  assert.match(html, /<option value="srednja-skola" selected="">Srednja škola<\/option>/i);
  assert.match(html, /<meta property="og:image" content="(?:https?:\/\/[^\"]+)?\/og\.png"/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|vinext-starter/i);
});

test("offline catalog and Mentor Match cover the full subject and education-level taxonomy", async () => {
  const [subjectResponse, matchResponse] = await Promise.all([
    render("/predmeti"),
    render("/mentor-match"),
  ]);
  assert.equal(subjectResponse.status, 200);
  assert.equal(matchResponse.status, 200);

  const subjectHtml = await subjectResponse.text();
  for (const label of ["Matematika", "Hrvatski jezik", "Informatika", "Ekonomija", "Latinski jezik"]) {
    assert.match(subjectHtml, new RegExp(label, "i"));
  }
  assert.match(subjectHtml, /value="srednja-skola" selected=""/i);
  assert.match(subjectHtml, /value="odrasli"/i);

  const matchHtml = await matchResponse.text();
  for (const label of ["Biologija", "Povijest", "Geografija", "Ekonomija", "Latinski jezik"]) {
    assert.match(matchHtml, new RegExp(label, "i"));
  }
});

test("server-renders the API-backed product screens", async () => {
  const routes = [
    ["/predmeti", /Predmeti za svaki/],
    ["/pronadi-profesora", /otključati tvoje znanje/],
    ["/ucenik/ai-mentor", /AI Study Studio/],
    ["/investitori", /REVENUE &amp; LIQUIDITY LAB/],
    ["/admin/podaci", /API i podatkovni model/],
  ];

  for (const [path, expected] of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, `${path} should render successfully`);
    assert.match(await response.text(), expected);
  }
});

test("AI Study Studio includes deterministic practice, assessment and provenance flows", async () => {
  const [response, source] = await Promise.all([
    render("/ucenik/ai-mentor"),
    readFile(new URL("../app/ucenik/ai-mentor/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const label of ["Mentor", "Objasni", "Vježbaj", "Test", "Kartice", "DOKAZ IZ UČENJA"]) {
    assert.match(html, new RegExp(label, "i"));
  }
  for (const behavior of ["practiceTasks", "quizQuestions", "flashcards", "checkPractice", "chooseQuizAnswer", "rateFlashcard", "34:05"]) {
    assert.match(source, new RegExp(behavior));
  }
});

test("investor simulator exposes live marketplace and AI revenue assumptions", async () => {
  const [response, source] = await Promise.all([
    render("/investitori"),
    readFile(new URL("../app/investitori/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const label of ["Pilot", "Rast", "Skala", "MJESEČNI GMV", "MARKETPLACE PRIHOD", "AI MRR", "PROJEKTIRANI ARR"]) {
    assert.match(html, new RegExp(label, "i"));
  }
  for (const behavior of ["mentorCount", "lessonsPerMentor", "averagePrice", "takeRate", "aiSubscribers", "marketplaceMrr", "aiMrr", "arr"]) {
    assert.match(source, new RegExp(behavior));
  }
  assert.match(html, /nije financijska prognoza/i);
});

test("server-renders authentication, matching, booking and account flows", async () => {
  const routes = [
    ["/prijava", /Nastavi gdje si stao/],
    ["/registracija", /Kreiraj svoj račun/],
    ["/zaboravljena-lozinka", /Zaboravljena lozinka/],
    ["/auth/google-demo?returnTo=%2Fucenik", /Lokalni SSO demo/],
    ["/mentor-match", /MENTOR MATCH/],
    ["/rezervacija/ana-kovac", /Učitavamo mentora/],
    ["/postavke", /Kontrola računa/],
  ];
  for (const [path, expected] of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, `${path} should render successfully`);
    assert.match(await response.text(), expected);
  }
});

test("root interaction layer covers the remaining prototype controls", async () => {
  const [layout, layer] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/InteractionLayer.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /<InteractionLayer\s*\/>/);
  for (const behavior of ["mobile-menu", "preuzmi pdf", "prikaži trag", "incident-row", "generic-workspace", "pošalji poruku", "pokreni video"]) {
    assert.match(layer.toLowerCase(), new RegExp(behavior));
  }
});

test("critical acquisition and attachment actions have concrete behavior", async () => {
  const [tutorResponse, studySource] = await Promise.all([
    render("/za-profesore"),
    readFile(new URL("../app/ucenik/ai-mentor/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(tutorResponse.status, 200);
  assert.match(await tutorResponse.text(), /href="\/registracija\?role=tutor"/i);
  assert.match(studySource, /attachmentInput\.current\?\.click\(\)/);
  assert.match(studySource, /type="file"[^>]+hidden/);
});
