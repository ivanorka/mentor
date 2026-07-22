# Netlify API i Neon

## Postavljanje

1. U Netlify projektu za **Mentor** dodaj varijablu `DATABASE_URL` u **Environment variables**. Vrijednost je pooled connection string s Neon development grane; ne sprema se u Git niti u `.env.example`.
2. Deployaj ovaj repozitorij. `netlify.toml` preusmjerava `/api/v1/*` na funkciju `api`.
3. Nakon deploya otvori `/api/v1/health`. Odgovor mora sadržavati `status: "ok"` i `database: "neon"`.

## Lokalni rad na istoj online bazi

Lokalni frontend može raditi nad potpuno istom Neon development granom kao Netlify deployment, bez izlaganja baze pregledniku.

1. Aktiviraj Node 24 (`nvm use`; projekt ima `.nvmrc`).
2. Kopiraj `.env.example` u `.env.local`.
3. U `.env.local` postavi svoj Neon development `DATABASE_URL` i `NEXT_PUBLIC_API_BASE_URL=/api/v1`.
4. Pokreni `npm run dev:netlify` i otvori lokalnu adresu koju ispiše Netlify Dev.

Netlify Dev lokalno poslužuje Next.js i funkcije, dok funkcija `api` server-side pristupa Neonu. Time lokalni browser nikada ne dobiva `DATABASE_URL`, a kreirani korisnici, rezervacije i poruke odmah ostaju u zajedničkoj development bazi.

Za samostalni Go demo backend i dalje možeš koristiti obični `npm run dev`; on po zadanom koristi `http://localhost:8081/api/v1`.

## Heartbeat / cold start

`netlify/functions/keep-warm.mjs` je Scheduled Function koja svakih pet minuta izvršava lagani `SELECT 1` na Neon pooled vezi. To:

- periodično provjerava da su Netlify funkcija, varijabla okruženja i Neon dostupni;
- zapisuje latenciju u Netlify Function logs;
- smanjuje vjerojatnost prvog sporijeg pristupa nakon dulje neaktivnosti.

Netlify Functions su ipak ephemeral serverless runtime: raspoređeni ping ne može jamčiti da će točno ista instanca ostati stalno pokrenuta. Ako proizvod treba strogu, uvijek-toplu API instancu, API treba preseliti na uvijek-aktivan container servis; heartbeat i Neon ostaju kao health signal.

## E-mail obavijesti

E-mail sloj koristi Resend API — aplikacija nikada ne sprema niti koristi osobnu Gmail lozinku. U Netlify projektu **Mentor** dodaj ove varijable za `Production` i po potrebi `Deploy previews`:

| Varijabla | Svrha |
| --- | --- |
| `RESEND_API_KEY` | Resend API ključ za slanje transakcijskih poruka. |
| `NOTIFICATION_FROM` | Potvrđena adresa pošiljatelja, npr. `Gaudeamus Mentor <obavijesti@mentor.orka.solutions>`. |
| `NOTIFICATION_TEAM_EMAIL` | Interni inbox za obavijest o novoj registraciji. |
| `PUBLIC_SITE_URL` | Javna URL adresa Mentora, za linkove u e-mailovima. |

Za slanje s vlastite domene prvo ju treba verificirati u Resendu. Dok ključ nije postavljen, aplikacija nastavlja raditi bez greške, a u Function logu jasno bilježi da je obavijest preskočena.

Trenutačni događaji:

- registracija e-mailom ili Googleom te interna obavijest o novom računu;
- aktivacija/deaktivacija računa i promjena lozinke preko superadmina;
- kreiranje rezervacije, uspješno testno plaćanje i potvrda sata za učenika i profesora;
- nova poruka u razgovoru;
- podsjetnici za potvrđeni sat približno 24 sata i jedan sat prije početka.

Podsjetnici se izvršavaju Netlify Scheduled Functionom svakih pet minuta. Tablica `gm_notification_outbox` osigurava da isti primatelj ne primi dupli podsjetnik, čak ni kada se raspoređeni posao ponovi.

## Operativne provjere

- U **Functions** provjeri `keep-warm` log svakih pet minuta i očekuj `gaudeamus_heartbeat` sa `status: "ok"`.
- Ako dobiješ `DATABASE_URL is not configured`, varijabla nije postavljena za aktivni deploy context.
- Za produkciju koristi zasebnu Neon production granu i zaseban `DATABASE_URL`; development grana služi samo za razvoj i testiranje.
