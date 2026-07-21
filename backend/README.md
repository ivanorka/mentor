# Gaudeamus Mentor API

Go/Gin backend za klikabilni full-stack prototip marketplacea instrukcija. Servis pokriva katalog, reputaciju, dostupnost, rezervacije, naplatu, životni ciklus videolekcije, AI materijale, personalizirane testove, moderirani chat i operativnu analitiku.

## Pokretanje

Preduvjet je Go 1.26+.

```bash
cd backend
cp .env.example .env
API_ADDR=:8081 go run ./cmd/api
```

Provjera:

```bash
curl http://localhost:8081/health
curl http://localhost:8081/api/v1/education-levels
curl 'http://localhost:8081/api/v1/tutors?subject=matematika'
curl -c /tmp/gaudeamus-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"luka.petrovic@example.test","password":"Gaudeamus2026!"}' \
  http://localhost:8081/api/v1/auth/login
curl -b /tmp/gaudeamus-cookie.txt http://localhost:8081/api/v1/bookings
```

Frontend koristi `NEXT_PUBLIC_API_BASE_URL=http://localhost:8081/api/v1` i ima siguran fallback na tu adresu.

## Autentikacija i sesije

Računi se registriraju preko `POST /api/v1/auth/register`, a prijavljuju preko `POST /api/v1/auth/login`. Lozinke se spremaju kao bcrypt sažetak. Uspješna prijava izdaje slučajan neprozirni token, server sprema samo njegov SHA-256 sažetak, a preglednik ga prima u sedmodnevnom `HttpOnly`, `SameSite=Lax` kolačiću `gm_session`. Odjava odmah poništava serversku sesiju. Vjerodajnice i sesije zapisuju se atomarno s dozvolom `0600`, pa registracija i login nastavljaju raditi nakon restarta procesa.

Svi seed računi imaju demo lozinku `Gaudeamus2026!`:

- učenik: `luka.petrovic@example.test`
- profesor: `ana.kovac@example.test`
- administrator: `marta.oreskovic@example.test`

Zaglavlje `X-Demo-User-ID` ostaje dostupno samo za lokalne testove i automatizirane demo scenarije. Dostupne seed identitete vraća `GET /api/v1/demo/identities` kada je `DEMO_MODE=true`.

### Google SSO

Backend implementira OAuth 2.0 web-server authorization-code tok s `state` i `nonce` vrijednostima, razmjenom koda na Google token endpointu i dohvatom verificiranog profila preko OpenID Connect `userinfo` endpointa. Postavite:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URL=http://localhost:8081/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Istu redirect adresu unesite kao autorizirani redirect URI u Google Cloud Console. Ako ključevi nisu postavljeni, `DEMO_MODE=true` preusmjerava na jasno označen lokalni Google SSO demo; ne glumi produkcijsku verifikaciju.

## Podatkovni model

Seed sadrži 41 korisnika, 20 predmeta, 20 profesora, 20 učenika, termine, rezervacije, sate, naplate, recenzije, poruke, AI pakete i trust & safety događaje. Izvor je [`data/seed.json`](data/seed.json). Kanonske obrazovne razine dostupne su preko `GET /api/v1/education-levels`: osnovna škola, srednja škola (zadana u sučelju), matura, fakultet i odrasli. Backend i dalje prihvaća postojeće hrvatske labele radi kompatibilnosti.

Po zadanim postavkama mutacije se trajno čuvaju u datotekama koje su isključene iz Gita:

```bash
DATA_SNAPSHOT_FILE=data/runtime.snapshot.json
AUTH_STATE_FILE=data/auth.runtime.json
```

`runtime.snapshot.json` sadrži profile, rezervacije i ostalu domenu. `auth.runtime.json` sadrži isključivo bcrypt vjerodajnice i sažetke neprozirnih session tokena — nikada izvorne lozinke ni izvorne tokene. Za izolirani test obje varijable mogu pokazivati na privremeni direktorij.

Pri pokretanju se novi seed katalog i novi demonstracijski profili spajaju s runtime snapshotom. Seed definicija kataloga ima prednost, dok registrirani korisnici, njihove profilne promjene i transakcije iz snapshota ostaju sačuvani. Time proširenje kataloga ne zahtijeva brisanje lokalnih računa.

Store je zaključan `RWMutex` mehanizmom; rezervacija termina i provjera preklapanja izvršavaju se unutar iste kritične sekcije.

## Poslovna pravila

- Profesor mora predavati odabrani predmet, a rezervacija mora odgovarati otvorenom terminu.
- Kombinirani filtri predmeta, razine i cijene moraju odgovarati istoj profesorovoj ponudi; rangiranje ima determinističan redoslijed.
- Nova profesorska registracija prihvaća kanonske `levels` vrijednosti, a bez njih sigurno koristi samo zadanu razinu Srednja škola.
- Termin traje 30–120 minuta; backend atomarno sprječava dvostruku rezervaciju.
- Cijena se računa iz cjenika profesora i trajanja. Platforma uzima 15%, a ostatak postaje isplata profesoru.
- Samo plaćena rezervacija prelazi u `confirmed` i može otvoriti sat.
- Završetak aktivnog sata označava snimku/transkript spremnima i generira strukturirani AI paket.
- Ocjenu može ostaviti samo učenik nakon dovršenog sata, jednom po rezervaciji.
- Chat redigira e-mail, hrvatske telefonske brojeve i nazive vanjskih komunikacijskih kanala te stvara trust događaj.
- Razgovor je vezan uz rezervaciju i čitaju ga samo njegovi sudionici ili administrator.
- AI test prioritizira područje s najnižim mastery rezultatom učenika.

## Slojevi

```text
cmd/api          konfiguracija i graceful shutdown
internal/httpapi Gin rute, CORS, demo auth, response envelope
internal/service poslovna pravila i transakcijski tokovi
internal/store   concurrency-safe spremište i JSON snapshot
internal/domain  modeli domene
data             reproducibilni demo dataset
docs             OpenAPI ugovor
```

## Testovi

```bash
go test ./...
```

Testirana je registracija, bcrypt prijava, session cookie, odjava, preživljavanje korisnika i sesije kroz restart, trajno opozivanje sesije, Google demo, kalkulacija provizije, zabrana preklapanja, moderacija kontakta, health/search API i zaštita privatnih ruta.

## Produkcijski put

Za prvu produkcijsku verziju servisni ugovori ostaju isti, a infrastrukturni adapteri se zamjenjuju:

1. PostgreSQL za transakcije, profile i reputaciju; Redis za kratkotrajne lockove i rate limits.
2. Stripe/Adyen za Payment Intent, refund, payout i webhook idempotency.
3. S3/R2 za snimke i dokumente uz enkripciju, rokove čuvanja i eksplicitni pristanak.
4. LiveKit/Daily za videopozive i događaje kvalitete sesije.
5. Asinkroni AI worker za transkript, materijale i moderaciju, s human-review tokom.
6. Postojeći OIDC/session sloj nadograditi trajnim session storeom, rotacijom, audit logom, rate limitingom, MFA opcijom i GDPR procedurama.

Potpuni ugovor je u [`docs/openapi.yaml`](docs/openapi.yaml).
