# TeamPlanner – MVP dokumentáció

## Az alkalmazás célja

A TeamPlanner egy kis csapatoknak szánt, egyszerű projekt- és feladatkezelő felület. Célja, hogy egyetlen áttekinthető oldalon mutassa meg a folyamatban lévő projekteket, a hozzájuk tartozó feladatokat, a felelősöket és a határidőket.

## A jelenlegi MVP funkciói

- meglévő projektek listázása és kiválasztása;
- új projekt létrehozása névvel és rövid leírással;
- a kiválasztott projekthez tartozó feladatok megjelenítése;
- új feladat létrehozása névvel, leírással, felelőssel, határidővel és állapottal;
- becsült munkaórák megadása, szerkesztése és megjelenítése feladatonként;
- a kiválasztott projekthez tartozó feladatok szerkesztése;
- terhelési és határidőütközési figyelmeztetések megjelenítése;
- az összes hozzáférhető projekt megjelenítése egy közös listában;
- regisztráció, bejelentkezés és kijelentkezés;
- saját Google Naptár csatlakoztatása, határidős feladatok kézi exportja és későbbi automatikus frissítése;
- rövid magyar feladatösszefoglaló készítése kifejezett gombnyomásra;
- három egyszerű feladatállapot kezelése: „Teendő”, „Folyamatban” és „Kész”.

## Fő felületi elemek

A bal oldali projektlistában egyszerre látható minden projekt, amelyhez a felhasználó hozzáfér, csapattól függetlenül. Nincs külön „Aktív csapat” választó: a projektek között közvetlenül ebből a listából lehet váltani. A kiválasztott projekt feladatai a jobb oldali munkaterületen jelennek meg. Az „Új projekt” és „Új feladat” gombok egyszerű párbeszédablakokat nyitnak meg. A jogosult vezető a kiválasztott projekt fejlécében található „Csapattagok” gombbal kezelheti a kapcsolódó csapat tagjait. A feladatkiosztás taglistája mindig a kiválasztott projekthez igazodik. Kisebb képernyőn a két munkaterület egymás alá rendeződik.

## Terhelés és határidőütközések

A feladatokhoz 0,5–1000 közötti becsült munkaóra adható meg félórás lépésekben. Ezt a projekt vezetője kezelheti; a csapattag továbbra is csak a saját feladatának állapotát módosíthatja. A becslés a feladatlistában is látható. A létrehozási és szerkesztési ablak a felelős befejezetlen feladatainak becsült óráit összesíti a határidő napjára és az azt megelőző hét napra, a szerkesztett feladat duplázása nélkül. Az aktuális feladat becslése csak akkor számít bele, ha nem kész. Más projektek feladatai a terhelési összeg részei lehetnek, de a hozzáférés nélkül rejtett projektek neve és feladatcíme továbbra sem jelenik meg.

A túlterhelési figyelmeztetés meglévő, feladatszámon alapuló szabálya megmarad; az óraszám tájékoztató becslés, nem automatikus kapacitáskorlát. A `20261103120000_add_estimated_hours` migráció bevezeti a `Task.estimatedHours` mezőt. A régi feladatok egyórás alapértéket kapnak, amelyet a vezető pontosíthat. A létrehozási és teljes szerkesztési API-kérésben az `estimatedHours` kötelező szám; a backend a tartományt és a félórás lépést is ellenőrzi. Az állapotmódosítási kérés ezt a mezőt nem írhatja át.

Az alkalmazás egyszerű szabállyal jelzi a lehetséges túlterheltséget. Ha a kiválasztott csapattagnak már legalább két befejezetlen feladata van a megadott határidőt megelőző hét napban, a feladat létrehozásakor vagy szerkesztésekor figyelmeztetés jelenik meg. A jelzés a felelős és a határidő mező közelében látható, és nem tiltja le a mentést.

A sűrű határidővel érintett meglévő feladatok a listában is visszafogott jelölést kapnak. A figyelmeztetésben más projektek kapcsolódó feladatai is megjelenhetnek a terhelés megértéséhez, de ezek csak megtekinthetők: az aktuális projektből nem módosíthatók, nem oszthatók át, az állapotuk nem változtatható meg, és nem törölhetők.

## Csapatok és jogosultságok

A regisztrációs név megjelenítési név, nem egyedi: több felhasználó azonos nevet is választhat. Az e-mail-cím továbbra is egyedi. A feladatkiosztás, állapotmódosítási jogosultság és terhelésvizsgálat a felhasználó azonosítóját (`assigneeId`) használja, ezért az azonos nevű tagok nem kapnak hozzáférést egymás feladataihoz. A választólisták az azonos neveket sorszámmal különböztetik meg.

A `20261013130000_allow_duplicate_user_names` migráció megszünteti a név egyediségét és bevezeti a feladat `assigneeId` mezőjét. A meglévő, egyértelmű névhez tartozó kiosztásokat megőrzi. A feladat `assignee` mezője továbbra is a megjelenített nevet tárolja; az API létrehozáskor és teljes szerkesztéskor `assigneeId` értéket vár, és a nevet szerveroldalon határozza meg. Ismeretlen vagy nem egyértelmű régi felelős esetén az azonosító null marad, és a vezetőnek újra kell választania a felelőst. A migrációt a meglévő helyi `prisma/setup.ts` is idempotensen alkalmazza.

Minden bejelentkezett felhasználó létrehozhat saját projektet akkor is, ha más projektben csak csapattag. Az új projektben ő lesz a projektvezető; mások projektjeiben ettől nem kap további jogosultságot. A csapatok a háttérben továbbra is tárolják a tagságokat és jogosultságokat, de nincs külön csapatlétrehozási vagy csapatválasztási felület. Ha a felhasználónak még nincs saját vezetésű csapata, az új projekthez automatikusan elkészül egy saját csapat, kezdetben csak a létrehozó tagságával. Később új projekt a saját vezetésű csapathoz kapcsolódik: ha az aktuális projekt ilyen csapathoz tartozik, azt használjuk, egyébként az első saját vezetésű csapatot. Más vezető csapatában csak a tagság alapján továbbra sem hozható létre projekt. A fejlécben jelzett szerep a kiválasztott projekthez igazodik. A tagkezelés továbbra is a csapathoz tartozik: a közös csapathoz kapcsolódó projektek tagsága együtt változik.

A csapat vezetője kezelheti a csapattagokat, projekteket hozhat létre, és a csapat projektjeiben feladatokat hozhat létre, szerkeszthet, kioszthat vagy törölhet. A csapattag megtekintheti a csapat projektjeit és feladatait, de csak a saját nevéhez rendelt feladatok állapotát módosíthatja. Más csapat projektjei és feladatai nem módosíthatók.

Az alkalmazásban e-mail-címmel és jelszóval lehet regisztrálni, bejelentkezni és kijelentkezni. A csapatvezetői és tagi működés a két előre elkészített bemutató fiókkal is kipróbálható: Nóra a „Kreatív csapat” tagja, Eszter pedig ugyanennek a csapatnak a létrehozója és vezetője. A felhasználó a bal oldali közös projektlistából választhat.

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

A naptárkapcsolat és az összefoglalás beállítása, működése és hibakezelése a [Kapcsolatok dokumentációban](integrations.md) olvasható. A naptárkapcsolat felhasználónként külön működik; a tagok saját naptárukba exportálhatnak olyan feladatokat, amelyek projektjéhez hozzáférnek. Ez nem ad új feladatmódosítási jogosultságot.

Az MVP helyi Express backendet és SQLite adatbázist használ, így a projektek, feladatok, tagságok és munkamenetek az újraindítások között is megmaradnak. A React felület REST API-n keresztül olvassa és módosítja az adatokat. A terhelésvizsgálat továbbra is egyszerű bemutatólogika, nem teljes értékű ütemezési rendszer. Az auth megoldás az MVP helyi használatára készült; éles üzemeltetéshez HTTPS, e-mail-megerősítés, jelszó-visszaállítás, próbálkozáskorlátozás és további biztonsági védelem szükséges.
