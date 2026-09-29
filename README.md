# Szülinapi 3D üdvözlő

Three.js + Vite alapú, teljesen 3D-s születésnapi oldal:

0. **Dátumos zár:** a nyitóképen egy közös dátumot kell megadni (pl. „Mikor találkoztunk először?”).
   Utána halk zenedobozos háttérzene szól egészen a gyertyákig.
1. **Ajándékdoboz** lebeg és forog. Koppintásra megrázkódik, lerepül a teteje, szétnyílnak a falai.
2. **Képeslap** emelkedik ki belőle. Koppintásra kinyílik: bal oldalon fotók, jobb oldalon az üzenet
   (egy oldalra koppintva ránagyít, ami telefonon hasznos). Az üzenet „kézzel” íródik ki.
3. **Torta** „22”-es égő gyertyákkal. El lehet fújni **mikrofonba fújva**, vagy a gyertyákra koppintva.
4. **Finálé:** elsötétül, majd konfetti, tűzijáték, lufik és zene jön (saját mp3, vagy zenedobozos
   „Happy Birthday”, ha nincs), a képek pedig körbe keringenek a torta körül (koppintásra előrejönnek).
5. **Csillagos égbolt:** a „Nézz fel az égre” gombra besötétedik, hullócsillagok suhannak át.
   A beírt kívánság felszáll az égre, hullócsillag lesz belőle, a helyén pedig szív alakú csillagkép rajzolódik ki.

## Személyre szabás

- Szövegek, név, képek: `src/config.js` (nincs a repóban – első indítás előtt: `cp src/config.sample.js src/config.js`)
- Képek: `public/photos/` (pl. `1.jpg`, `2.jpg`, …). Ha egy kép hiányzik, helykitöltő jelenik meg.
- Zene: `public/music/` mappába (a fájlnév és a kezdőpont a `config.js`-ben állítható).
- Link-előnézet (Messenger, WhatsApp): szövege a `config.js` `preview` mezőjében, képe a `public/preview.jpg`.
  Feltöltés után írd be a `siteUrl`-t (az oldal teljes címét), különben sok alkalmazás nem mutatja a képet.

## Futtatás

```bash
cp src/config.sample.js src/config.js   # majd írd át a saját adataidra
npm install
npm run dev      # fejlesztői szerver
npm run build    # statikus build a dist/ mappába (bárhová feltölthető, pl. GitHub Pages)
```

A mikrofonos fújáshoz HTTPS (vagy localhost) kell.
