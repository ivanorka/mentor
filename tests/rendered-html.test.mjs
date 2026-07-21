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
  assert.match(html, /<meta property="og:image" content="\/og\.png"/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|vinext-starter/i);
});

test("server-renders the API-backed product screens", async () => {
  const routes = [
    ["/predmeti", /Predmeti za svaki/],
    ["/pronadi-profesora", /otključati tvoje znanje/],
    ["/admin/podaci", /API i podatkovni model/],
  ];

  for (const [path, expected] of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, `${path} should render successfully`);
    assert.match(await response.text(), expected);
  }
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
  for (const behavior of ["mobile-menu", "preuzmi pdf", "prikaži trag", "incident-row", "generic-workspace", "pošalji poruku"]) {
    assert.match(layer.toLowerCase(), new RegExp(behavior));
  }
});
