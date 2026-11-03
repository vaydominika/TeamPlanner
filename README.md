# TeamPlanner

Egyszerű, magyar nyelvű csapat-, projekt- és feladatkezelő MVP helyi adatbázissal és bejelentkezéssel.

## Technológiák

React, TypeScript, Vite, Tailwind CSS, Radix UI, Express, Prisma és SQLite.

## Helyi indítás

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

A részletesebb leírás a [docs/mvp.md](docs/mvp.md) fájlban található.

Node.js 24 vagy újabb szükséges. Windows PowerShellben a másolás: `Copy-Item .env.example .env`. A backend a gyökérben lévő `.env` fájlt automatikusan betölti; a rendszer környezeti változói elsőbbséget élveznek. A naptár és az összefoglalás beállítása nélkül a szokásos feladatkezelés használható.

A Google Naptárhoz `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` és `INTEGRATION_ENCRYPTION_KEY` szükséges. A kulcs 32 véletlen bájt hexadecimális formában. Az összefoglaláshoz választható a Gemini vagy az OpenAI. Ezek kizárólag szerveroldali értékek; ne használj `VITE_` előtagot. A pontos OAuth-beállítások, végpontok és biztonsági tudnivalók a [docs/integrations.md](docs/integrations.md) fájlban találhatók.

Gemini beállítása a `.env` fájlban:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=az-ai-studio-api-kulcsod
GEMINI_MODEL=gemini-3.1-flash-lite
```

A kulcs a [Google AI Studio](https://aistudio.google.com/api-keys) felületén készíthető; különbözik a Google Naptár OAuth-kliensének titkától. A modellhez elérhető ingyenes keret korlátozott; ellenőrizd a projekted aktuális kvótáját és díjcsomagját. [Gemini díjak és ingyenes keretek](https://ai.google.dev/gemini-api/docs/pricing). Ezután indítsd újra a backendet. OpenAI használatához `LLM_PROVIDER=openai`, `OPENAI_API_KEY` és `OPENAI_MODEL` szükséges. Ha az `LLM_PROVIDER` nincs megadva, a korábbi OpenAI-beállítás marad érvényes. Nincs automatikus átváltás másik szolgáltatóra vagy modellre.

Meglévő helyi adatbázis frissítése bemutató adatok módosítása nélkül:

```bash
npx tsx prisma/setup.ts
npm run db:generate
```

A változáshoz Prisma-migráció is tartozik: `20261013120000_add_integrations`. A helyi `db:setup` eddigi, idempotens SQLite-eljárását követve ugyanennek a migrációnak a tábladefiníciói kerülnek alkalmazásra. Meglévő, ezzel az eljárással létrehozott adatbázison ne futtass ellenőrzés nélkül `prisma migrate deploy` parancsot: az MVP korábbi migrációs története és a helyi inicializálás eltérhet.

Ellenőrzés: `npm test`, `npm run lint`, `npm run build`.

A feladatoknál becsült munkaóra is megadható. A `20261103120000_add_estimated_hours` migráció a régi feladatokhoz egyórás alapértéket ad. Frissítés: `npx tsx prisma/setup.ts`, majd `npm run db:generate`; az adatbázis-kliens generálása előtt állítsd le a futó backendet.

A megjelenítési név regisztrációkor nem egyedi, az e-mail-cím igen. A `20261013130000_allow_duplicate_user_names` migráció a feladatfelelősöket azonosítóhoz köti, és megőrzi a meglévő kiosztásokat; a fenti helyi frissítési parancsok ezt is alkalmazzák.
