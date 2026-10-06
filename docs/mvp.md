# TeamPlanner – MVP dokumentáció

## Az alkalmazás célja

A TeamPlanner egy kis csapatoknak szánt, egyszerű projekt- és feladatkezelő felület. Célja, hogy egyetlen áttekinthető oldalon mutassa meg a folyamatban lévő projekteket, a hozzájuk tartozó feladatokat, a felelősöket és a határidőket.

## A jelenlegi MVP funkciói

- meglévő projektek listázása és kiválasztása;
- új projekt létrehozása névvel és rövid leírással;
- a kiválasztott projekthez tartozó feladatok megjelenítése;
- új feladat létrehozása névvel, leírással, felelőssel, határidővel és állapottal;
- a kiválasztott projekthez tartozó feladatok szerkesztése;
- terhelési és határidőütközési figyelmeztetések megjelenítése;
- több csapat létrehozása és csapatonkénti jogosultságok;
- regisztráció, bejelentkezés és kijelentkezés;
- három egyszerű feladatállapot kezelése: „Teendő”, „Folyamatban” és „Kész”.

## Fő felületi elemek

A főoldal tetején található csapatválasztóval lehet az elérhető csapatok között váltani. A bal oldalon a kiválasztott csapat projektjei láthatók, a kiválasztott projekt feladatai pedig a jobb oldali, nagyobb munkaterületen jelennek meg. Az „Új csapat”, „Új projekt” és „Új feladat” gombok egyszerű párbeszédablakokat nyitnak meg. Kisebb képernyőn a két munkaterület egymás alá rendeződik.

## Terhelés és határidőütközések

Az alkalmazás egyszerű szabállyal jelzi a lehetséges túlterheltséget. Ha a kiválasztott csapattagnak már legalább két befejezetlen feladata van a megadott határidőt megelőző hét napban, a feladat létrehozásakor vagy szerkesztésekor figyelmeztetés jelenik meg. A jelzés a felelős és a határidő mező közelében látható, és nem tiltja le a mentést.

A sűrű határidővel érintett meglévő feladatok a listában is visszafogott jelölést kapnak. A figyelmeztetésben más projektek kapcsolódó feladatai is megjelenhetnek a terhelés megértéséhez, de ezek csak megtekinthetők: az aktuális projektből nem módosíthatók, nem oszthatók át, az állapotuk nem változtatható meg, és nem törölhetők.

## Csapatok és jogosultságok

Minden regisztrált felhasználó egyszerű tagként indul, és több csapatot is létrehozhat. Aki létrehoz egy csapatot, annak a csapatnak automatikusan a vezetője lesz. A vezetői jogosultság csapatspecifikus: ugyanaz a felhasználó az egyik csapatban vezető, egy másikban egyszerű tag lehet.

A csapat vezetője kezelheti a csapattagokat, projekteket hozhat létre, és a csapat projektjeiben feladatokat hozhat létre, szerkeszthet, kioszthat vagy törölhet. A csapattag megtekintheti a csapat projektjeit és feladatait, de csak a saját nevéhez rendelt feladatok állapotát módosíthatja. Más csapat projektjei és feladatai nem módosíthatók.

Az alkalmazásban e-mail-címmel és jelszóval lehet regisztrálni, bejelentkezni és kijelentkezni. A csapatvezetői és tagi működés a két előre elkészített bemutató fiókkal is kipróbálható: Nóra a „Kreatív csapat” tagja, Eszter pedig ugyanennek a csapatnak a létrehozója és vezetője. A felület felső csapatválasztójával a felhasználó a saját csapatai között válthat.

A jelszavak nem olvasható formában, hanem sózott scrypt hashként kerülnek az adatbázisba. A bejelentkezés után a backend szerveroldali munkamenetet hoz létre, a böngésző pedig `HttpOnly` és `SameSite=Lax` beállítású sütit kap. A jogosultságokat a felület mellett a backend is ellenőrzi, ezért a korlátozás nem csak a gombok elrejtésére vagy letiltására épül.

## Használt technológiák

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui szemléletű, újrafelhasználható felületi komponensek
- Radix UI a párbeszédablakokhoz és választómezőkhöz
- Express alapú REST API
- Prisma ORM
- SQLite adatbázis

## Backend és jelenlegi korlátok

Az MVP helyi Express backendet és SQLite adatbázist használ, így a projektek, feladatok, tagságok és munkamenetek az újraindítások között is megmaradnak. A React felület REST API-n keresztül olvassa és módosítja az adatokat. A terhelésvizsgálat továbbra is egyszerű bemutatólogika, nem teljes értékű ütemezési rendszer. Az auth megoldás az MVP helyi használatára készült; éles üzemeltetéshez HTTPS, e-mail-megerősítés, jelszó-visszaállítás, próbálkozáskorlátozás és további biztonsági védelem szükséges.
