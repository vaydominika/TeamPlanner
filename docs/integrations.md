# Naptárkapcsolat és feladatösszefoglalás

## Használat

A felső „Naptárkapcsolat” gomb megnyitja a kapcsolati állapotot. A „Google Naptár csatlakoztatása” a Google engedélyezési oldalára irányít, majd visszatér az alkalmazásba. Az első export minden feladatnál külön, a „Naptárba szinkronizálás” gombbal indítható; a csatlakozás önmagában nem exportál feladatot.

A feladat neve, leírása, határideje és projektneve kerül a felhasználó elsődleges Google Naptárába. A határidő napjára egész napos esemény készül, amelynek záródátuma a következő nap. A felelős és a feladatállapot nem kerül a naptárba. A siker vagy hiba magyar visszajelzést kap a feladat mellett.

Az exportált feladat szerkesztése és a projekt átnevezése tartós frissítési jelzést hoz létre a helyi adatbázisban. A szerver félpercenként szinkronizálja ezeket. Az eseményazonosító megmarad, így az ismételt export és a hibák utáni újrapróbálás ugyanazt az eseményt frissíti. A már Google-ban törölt, 410-es választ adó esemény helyett új, elmentett azonosítóval készül esemény. A szinkronizálás az alkalmazásból a naptár felé egyirányú: a Google-ban végzett szerkesztés nem módosítja a feladatot.

Feladat vagy projekt törlésekor a hozzá tartozó eseménykapcsolatok feladatazonosítója nullára változik; ezek a kapcsolatok az upstream törlés sikeréig megmaradnak. A jogosultság elvesztésekor a korábban exportált eseményt szintén eltávolítjuk. A hozzáférést minden export előtt és minden háttérfrissítéskor újra ellenőrizzük. A terhelési összesítőben látható idegen projektek adatait nem exportáljuk.

A „Naptár lekapcsolása” törli a helyi hitelesítési adatokat, valamint megkísérli visszavonni a Google-engedélyt. A már exportált események a naptárban maradnak; lekapcsolás után nem követik a feladatok változását vagy törlését. Az eseményazonosítókat a duplikációk elkerülése érdekében megőrizzük. Ha a visszavonás hálózati hiba miatt elmarad, a felület kéri annak elvégzését a Google-fiókban. Újracsatlakozva a korábban exportált feladatok frissítése és a függő törlések folytatódnak. Másik Google-fiók csatlakoztatásakor ezek az aktuális elsődleges naptárba kerülnek; az előző fiók eseményeit ott kézzel lehet eltávolítani.

## Google-beállítások

1. A Google Cloud projektben engedélyezd a Google Calendar API-t, és állítsd be az OAuth hozzájárulási képernyőt. Tesztelési módban add hozzá a tesztfelhasználókat.
2. Hozz létre „Web application” típusú OAuth-klienst. A visszairányítási URI pontosan egyezzen a `GOOGLE_REDIRECT_URI` értékével. Helyben például: `http://localhost:5173/api/integrations/calendar/callback`. A Vite ezt a kérést a backendnek továbbítja.
3. Az `APP_URL` legyen a felület címe, helyben `http://localhost:5173`. A böngészőben is ugyanazt a hostnevet használd; a `localhost` és a `127.0.0.1` munkamenetsütije eltér.
4. Töltsd ki a szerveroldali környezeti változókat, majd indítsd újra a backendet. Éles környezetben HTTPS URL-ek és biztonságos titoktárolás szükséges.

A kért scope: `https://www.googleapis.com/auth/calendar.events.owned`. Nem kérünk címtárat, levelezést vagy általános Google-fiókadatokat. Az OAuth-folyamat rövid életű, egyszer használatos, hashként tárolt állapotot és PKCE-ellenőrzést használ. Az állapot a felhasználóhoz és az aktuális munkamenethez is kötött. A kódot és tokeneket kizárólag a backend dolgozza fel. A callback nem gyorsítótárazható, és nem küld referrer adatot.

## Összefoglalás

A feladat melletti „Összefoglaló készítése” legfeljebb 600 karakteres, magyar eredményt kér a kiválasztott szolgáltatótól: Gemini GenerateContent API vagy OpenAI Responses API. Ez egyszeri művelet, nem beszélgetés, és háttérben nem indul LLM-kérés. A gomb mellett adatküldési tájékoztató található. A `SummaryService` a közös `SummaryProvider` interfészen keresztül használja a szolgáltatót, az útvonal és a felület változatlan.

Kizárólag az adott feladat neve, legfeljebb 500 karakteres leírása, határideje, állapota, felelősének megjelenített neve és a projekt neve kerül a szolgáltatóhoz. Nem küldünk e-mailt, belső felhasználóazonosítót, projekttaglistát, projektleírást, más feladatot vagy terhelési összesítést. Kevés információnál az utasítás megtiltja a hiányzó részletek kitalálását. A feladat tartalmát adatként, nem követendő utasításként kezeljük; az eredményt React egyszerű szövegként jeleníti meg.

A legegyszerűbb megoldásként az összefoglaló csak a felületi komponensben él, nem kerül adatbázisba. A feladat vagy a projektnév változásakor, valamint az oldal újratöltésekor eltűnik, így nem jelenik meg régi adatból készült eredmény. Az OpenAI-kérés `store: false` beállítást használ; ez nem helyettesíti a szolgáltató adatkezelési szabályainak megismerését. A Gemini adatkezelésére a [Gemini API feltételei](https://ai.google.dev/gemini-api/terms) vonatkoznak; az ingyenes keret nem jelent helyi feldolgozást. Felhasználónként egyszerre egy összefoglaló-kérés engedélyezett.

Geminihez a [Google AI Studio](https://aistudio.google.com/api-keys) oldalán készíts API-kulcsot. A `.env` értékei: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=...`, `GEMINI_MODEL=gemini-3.1-flash-lite`, majd backend-újraindítás. Ez az API-kulcs különbözik a naptárkapcsolat OAuth-kliensazonosítójától és titkától. A kulcs csak a backend `x-goog-api-key` fejlécébe kerül, nem URL-paraméterbe, és nem kerül a frontendhez. A modell neve ellenőrzött, a szolgáltatói URL rögzített.

A [Gemini díjoldala](https://ai.google.dev/gemini-api/docs/pricing) a kiválasztott modellhez ingyenes keretet sorol fel; a tényleges hozzáférés és korlát a projekttől is függ. Ingyenes használathoz ellenőrizd az AI Studio díjcsomagját és kvótáját; a backend nem állítja be a Google számlázását. Kvótahibánál magyar 429-es választ adunk, nem váltunk másik modellre vagy fizetős szolgáltatóra, és nem próbálkozunk automatikusan újra. Modellcsere csak a `GEMINI_MODEL` tudatos módosításával történik.

## Környezeti változók

| Változó | Szerep |
| --- | --- |
| `APP_URL` | A böngészős felület rögzített visszatérési címe és engedélyezett originje |
| `GOOGLE_CLIENT_ID` | Google OAuth-kliens azonosító |
| `GOOGLE_CLIENT_SECRET` | Google OAuth-kliens titka |
| `GOOGLE_REDIRECT_URI` | Az engedélyezési kódot fogadó callback teljes URL-je |
| `INTEGRATION_ENCRYPTION_KEY` | 32 bájtos, 64 hexadecimális karakterből álló AES-256-GCM kulcs |
| `OPENAI_API_KEY` | Szerveroldali OpenAI API-kulcs |
| `OPENAI_MODEL` | A fiókban elérhető, Responses API-t támogató szöveges modell |
| `LLM_PROVIDER` | `gemini` vagy `openai`; ha hiányzik, a korábbi OpenAI működés marad |
| `GEMINI_API_KEY` | Szerveroldali Google AI Studio API-kulcs, csak Gemini esetén szükséges |
| `GEMINI_MODEL` | Gemini modellnév; alapértelmezés: `gemini-3.1-flash-lite` |

A backend betölti a gyökér `.env` fájlját; a már megadott rendszerkörnyezeti értékeket nem írja felül. A `.env` gitignore alatt áll. Kulcs előállítása: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Őrizd meg a titkosítási kulcsot a mentésekkel együtt, külön biztonságos helyen. Elvesztése vagy cseréje esetén a korábbi tokenek nem fejthetők vissza; a naptárat le kell kapcsolni és újracsatlakoztatni.

## API

Minden végpont a meglévő `tp_session` munkamenetet használja. A módosító integrációs kérések `Content-Type: application/json` fejlécet igényelnek, idegen originről és cross-site kéréssel nem érhetők el. A hibaformátum a meglévő `{ message }`, magyar szöveggel. A frontend nem kap hitelesítési adatokat.

| Metódus és útvonal | Eredmény |
| --- | --- |
| `GET /api/integrations/calendar` | Beállítottság, kapcsolati állapot, szolgáltatónév, függő műveletek száma és utolsó biztonságos hibaüzenet |
| `POST /api/integrations/calendar/connect` | `{ url }`: OAuth engedélyezési oldal |
| `GET /api/integrations/calendar/callback` | Állapot- és kódellenőrzés után visszairányít `calendar=connected` vagy `calendar=failed` jelzéssel |
| `DELETE /api/integrations/calendar` | Helyi tokenek törlése, engedély-visszavonás kísérlete, `{ message }` |
| `POST /api/tasks/:taskId/calendar` | Saját naptárba export vagy frissítés, `{ message }` |
| `POST /api/tasks/:taskId/summary` | Hozzáférhető feladat összefoglalása, `{ summary }` |

A tagok is használhatják az exportot és összefoglalást a megtekinthető projektek feladatain. Ez nem módosítja a közös feladatot: a szerkesztési és törlési szabályok változatlanok. Érvénytelen feladatazonosító 400, hiányzó munkamenet 401, tiltott projekt 403, nem létező feladat 404. Hiányzó naptárkapcsolat 409, párhuzamos összefoglaló 429, hiányzó konfiguráció vagy szolgáltatói hiba 503.

## Tárolás és migráció

A `20261013120000_add_integrations/migration.sql` három táblát vezet be:

- `CalendarConnection`: felhasználónként egy kapcsolat; szolgáltató és AES-256-GCM-mel titkosított access token, refresh token és lejárati idő egy hitelesített csomagban. Lekapcsoláskor a csomag nullára változik, a titkok törlődnek.
- `CalendarAuthorization`: felhasználónként az aktuális OAuth-kísérlet állapot-hashe, munkamenet-hashe, titkosított PKCE verifier és tízperces lejárat.
- `CalendarEvent`: belső feladat és külső esemény kapcsolata, függő jelzés, verzió és biztonságos utolsó hiba. A kapcsolat és feladat párosa egyedi. Feladattörléskor `SET NULL` őrzi meg a törlési teendőt; a kapcsolatok lekapcsoláskor is megmaradnak a későbbi duplikációk elkerülésére, de hitelesítési adatok nélkül nem futnak.

A meglévő helyi inicializálás az új migráció ugyanazon SQL-jét idempotensen alkalmazza. Meglévő adatok kímélő frissítéséhez `npx tsx prisma/setup.ts`, majd `npm run db:generate` szükséges. Új bemutató környezethez `npm run db:setup` használható. A normál feladatmódosítás és a szinkronizálási jelzés egy tranzakcióban kerül tárolásra; a külső hívás nincs ebben a tranzakcióban. A verzióellenőrzés megakadályozza, hogy egy közben módosított feladat újabb frissítési jelzését egy régebbi kérés törölje.

A HTTP-tesztek külön adatbázist adnak át a szervernek a `DATABASE_URL` környezeti változóval. Ez futásidejű felülbírálás; a helyi setup és Prisma CLI továbbra is a sémában lévő `prisma/dev.db` útvonalat használja. Szokásos helyi futtatásnál ezt a változót hagyd üresen.

## Hiba és tartalék működés

A naptár HTTP-hívások tíz másodperc után megszakadnak. A tokenek lejárat előtt frissülnek. Sikertelen szinkronizáláskor a feladat mentése érvényes marad, a teendő és hiba az adatbázisban megmarad, és a szerver újrapróbálja. A kapcsolati ablak félpercenként frissíti ezt az állapotot. Újraindítás után a függő munkák folytatódnak. Visszavont vagy lejárt engedély esetén lekapcsolás és újracsatlakozás szükséges.

Az LLM-kérés húsz másodperc után megszakad. Hiányzó konfiguráció, API-hiba, hálózati hiba, üres, túl hosszú vagy befejezetlen válasz magyar hibaüzenetet ad; a feladat ettől még kezelhető. Nem készítünk megtévesztő helyettesítő összefoglalót, és nincs automatikus LLM-újrapróbálás.

Gemininél csak `STOP` lezárással érkező, nem blokkolt szöveges jelölt fogadható el. A gondolati részeket figyelmen kívül hagyjuk. A hozzáférési hiba, nem elérhető modell és kimerült kvóta külön magyar visszajelzést kap. A szolgáltató nyers hibája vagy API-kulcsa nem jelenik meg a felületen. A Gemini-bővítés nem igényel új adatbázis-migrációt.

A háttérmunkás az MVP egyetlen szerverfolyamatához készült, a szolgáltatói hívásokat sorosítja. Több szerverpéldányhoz elosztott munkafoglalás és szolgáltatói terheléskorlátozás szükséges. A szolgáltatói tokenek és hibaválaszok nincsenek naplózva vagy továbbítva a felületre. Az adatbázis és mentései hozzáférését a titkosítás mellett is korlátozni kell.

## Ellenőrzés és hivatkozások

`npm test`, `npm run lint`, `npm run build`. A szolgáltatói tesztek helyi mockokat és külön ideiglenes SQLite-adatbázist használnak; nem küldenek valódi feladatot a Google-nak vagy az LLM-nek. Valódi fiókkal külön ellenőrizendő az OAuth-hozzájárulás, a tokenfrissítés és az események megjelenése.

Hivatalos leírások: [Google OAuth webalkalmazásokhoz](https://developers.google.com/identity/protocols/oauth2/web-server), [Google esemény létrehozása](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [OpenAI szöveggenerálás](https://developers.openai.com/api/docs/guides/text).
