# TeamPlanner – MVP dokumentáció

## Az alkalmazás célja

A TeamPlanner egy kis csapatoknak szánt, egyszerű projekt- és feladatkezelő felület. Célja, hogy egyetlen áttekinthető oldalon mutassa meg a folyamatban lévő projekteket, a hozzájuk tartozó feladatokat, a felelősöket és a határidőket.

## A jelenlegi MVP funkciói

- meglévő projektek listázása és kiválasztása;
- új projekt létrehozása névvel és rövid leírással;
- a kiválasztott projekthez tartozó feladatok megjelenítése;
- új feladat létrehozása névvel, leírással, felelőssel, határidővel és állapottal;
- három egyszerű feladatállapot kezelése: „Teendő”, „Folyamatban” és „Kész”.

## Fő felületi elemek

A főoldal bal oldalán található a projektek rövid listája. A kiválasztott projekt feladatai a jobb oldali, nagyobb munkaterületen jelennek meg. Az „Új projekt” és az „Új feladat” gombok egyszerű párbeszédablakokat nyitnak meg. Kisebb képernyőn a két terület egymás alá rendeződik.

## Használt technológiák

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui szemléletű, újrafelhasználható felületi komponensek
- Radix UI a párbeszédablakokhoz és választómezőkhöz

## Jelenlegi korlátok

Ez jelenleg kizárólag frontend prototípus. A létrehozott projektek és feladatok csak az oldal megnyitásának idejére maradnak meg; nincs háttérrendszer, adatbázis, felhasználói bejelentkezés, API-kapcsolat vagy tartós adattárolás.
