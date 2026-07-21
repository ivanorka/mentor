# Gaudeamus Mentor

Klikabilni full-stack EdTech prototip za marketplace instrukcija u kojem profesori grade mjerljivu reputaciju, učenici rezerviraju i plaćaju sate, a AI svaki sat pretvara u trajno personalizirano iskustvo učenja.

## Lokalno pokretanje

Preduvjeti: Node.js 22.13+ i Go 1.26+.

Frontend:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Backend, u drugom terminalu:

```bash
cd backend
cp .env.example .env
API_ADDR=:8081 go run ./cmd/api
```

- frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8081](http://localhost:8081)
- katalog predmeta: [http://localhost:3000/predmeti](http://localhost:3000/predmeti)
- API i dataset konzola: [http://localhost:3000/admin/podaci](http://localhost:3000/admin/podaci)

Demo prijava koristi lozinku `Gaudeamus2026!`:

- učenik: `luka.petrovic@example.test`
- profesor: `ana.kovac@example.test`

Registracija, prijava, odjava, obnova lozinke i Google SSO ulaz dostupni su na `/registracija` i `/prijava`. Bez Google ključeva lokalni prototip jasno prikazuje sigurni odabir seed identiteta; s ključevima backend koristi standardni OAuth 2.0 authorization-code tok.

## Produktni prostori

- Javni landing, katalog od 20 predmeta, objašnjivi Mentor Match, pretraga, dinamički profili profesora, booking flow i informativne stranice.
- Učenik: dashboard, povijest lekcija, AI paket, interaktivni Study Studio (objašnjenja, vježbe, testovi i kartice), poruke i videoučionica.
- Profesor: dashboard, kalendar, učenici, lekcije, poruke i zarada.
- Operacije: command center, korisnici, kvaliteta sati, financije, trust & safety, podrška, investitorski simulator te live API/dataset konzola.

Reproducibilni dataset sadrži 20 mentora i 20 učenika. Podržane su osnovna škola, srednja škola, matura, fakultet i odrasli; **Srednja škola** ostaje zadana razina kroz landing, katalog, pretragu, Mentor Match i registraciju profesora.

## Arhitektura

```text
Next.js / React / Vinext     Go 1.26 / Gin
          │                       │
          └──── REST / JSON ──────┤
                                  ├── poslovna pravila
                                  ├── concurrency-safe store
                                  ├── seed / JSON snapshot
                                  └── OpenAPI ugovor
```

Frontend ostaje kompatibilan s postojećim Cloudflare/Sites runtimeom. Go API izdaje neprozirnu sedmodnevnu sesiju u `HttpOnly`, `SameSite=Lax` kolačiću, lozinke štiti bcryptom i podržava Google OpenID Connect. Registrirani profili, bcrypt vjerodajnice i aktivne sesije trajno se zapisuju u ignorirane lokalne runtime datoteke te preživljavaju restart API-ja. Zaglavlje `X-Demo-User-ID` ostaje samo kao lokalni testni adapter.

Novi seed katalog pri pokretanju se sigurno spaja s runtime snapshotom: nove predmete i demonstracijske profile dobivate bez brisanja prethodno registriranih računa, rezervacija ili poruka.

## Build i hosting

- `npm run build` koristi službeni Next.js build i proizvodi `.next` za Netlify i njegov Next.js plugin.
- `npm run build:vinext` zadržava Vinext/Cloudflare Sites build u `dist` direktoriju.
- `npm run dev` pokreće standardni Next.js razvojni server; `npm run dev:vinext` ostaje dostupan za Sites razvoj.

## Dokumentacija

- [`backend/README.md`](backend/README.md) — domenski model, poslovna pravila, demo auth, persistence i produkcijski put
- [`backend/docs/openapi.yaml`](backend/docs/openapi.yaml) — REST ugovor
- [`backend/data/seed.json`](backend/data/seed.json) — reproducibilni demo dataset

## Provjera

```bash
npm run lint
npm test

cd backend
go vet ./...
go test ./...
```

`.openai/hosting.json` čuva Sites konfiguraciju, a `db/` i `examples/d1/` ostaju spremni za budući Cloudflare D1 adapter. Glavni prototip trenutno koristi Go backend na portu 8081.
