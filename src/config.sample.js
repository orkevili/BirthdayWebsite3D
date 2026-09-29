// ─────────────────────────────────────────────────────────────
//  Minta konfiguráció – másold le  src/config.js  néven, és írd át a saját adataidra:
//    cp src/config.sample.js src/config.js
//  Itt tudod személyre szabni az oldalt – minden szöveg és kép innen jön.
//  A képeket a  public/photos/  mappába tedd, és itt hivatkozz rájuk.
// ─────────────────────────────────────────────────────────────

export const config = {
  // Az ünnepelt neve (a képeslapon és a végén jelenik meg)
  name: 'Anna',

  // Belépés: a nyitóképen ezt a dátumot kell megadni, hogy kinyíljon az oldal.
  // Formátum: ÉÉÉÉ-HH-NN.  Ha nem kell zár, írd:  unlock: null
  // (Figyelem: ez csak játékos zár, nem valódi védelem – a forráskódban látható.)
  unlock: {
    question: 'Mikor találkoztunk először?',
    date: '2024-01-01',
    hint: 'Gondolj vissza a kezdetekre… 💭',
  },

  // Hányadik szülinap – a gyertyák mindig "22"-t mutatnak, ez a szövegekhez kell
  age: 22,

  // Képeslap borítója
  coverTitle: ['Boldog', 'Szülinapot!'],

  // Képeslap belső, jobb oldala
  cardTitle: 'Drága Anna!',
  message:
    'Ma egy különleges nap van, mert 22 évvel ezelőtt megszülettél, ' +
    'és azóta sokkal szebb lett a világ.\n' +
    'Kívánom, hogy ez az év hozzon rengeteg nevetést, kalandot, ' +
    'szeretetet és apró csodát. Maradj mindig ilyen ragyogó, kedves ' +
    'és önmagad!',
  signature: 'Szeretettel:\nValaki',
  // Az üzenet kiírásának sebessége: 1 = alap, 2 = kétszer gyorsabb, 0.5 = feleolyan gyors
  writeSpeed: 1.5,

  // Képeslap belső, bal oldala (az első 3 kép kerül rá),
  // a végén pedig az összes kép körbe-körbe lebeg a torta körül.
  photosTitle: 'Közös emlékeink',
  photos: [
    { src: 'photos/1.jpg', caption: 'A kedvenc napunk' },
    { src: 'photos/2.jpg', caption: 'Napozás' },
    { src: 'photos/3.jpg', caption: 'Kaland' },
    { src: 'photos/4.jpg', caption: 'Mi ketten' },
    { src: 'photos/5.jpg', caption: '<3' },
    { src: 'photos/6.jpg', caption: 'Mindig' },
  ],

  // A gyertyák elfújása utáni finálé
  finalTitle: 'Boldog 22. születésnapot!',
  finalMessage: 'Kívánom, hogy minden álmod valóra váljon ✨',

  // A finálé alatt a tortára koppintva egy szelet emelkedik ki, benne ez az üzenet
  slice: {
    title: 'Egy szelet csak neked',
    message:
      'Ide jöhet egy titkos üzenet…\n' +
      'például egy közös program időpontja!',
  },

  // Zene a fináléhoz: tedd az mp3-at a  public/music/  mappába.
  // Ha a fájl nem található, egy zenedobozos "Happy Birthday" szól helyette.
  music: 'music/zene.mp3',
  musicStart: 24, // hányadik másodperctől induljon a szám (pl. a refrénnél)

  // Csillagos égbolt a finálé után
  wishTitle: 'A kívánságod úton van 💫',
  wishMessage: 'A csillagok már vigyáznak rá – remélem, hamarosan valóra válik ✨',

  // Záró sor a legvégén, a csillagkép alatt
  closing: 'Boldog szülinapot! Szeretettel: Valaki 💕',

  // Link-előnézet (Messenger, WhatsApp, stb.) – szándékosan nem árul el semmit
  preview: {
    title: 'Egy meglepetés vár rád 🎁',
    description: 'Nyisd ki, ha készen állsz… 💝',
  },
  // Feltöltés után ide írd az oldal teljes címét (pl. 'https://valami.netlify.app/'),
  // mert a legtöbb csevegőalkalmazás csak teljes címmel tölti be az előnézeti képet.
  siteUrl: '',
};
