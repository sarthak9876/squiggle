/* Game type 5 of 5: ODD ONE OUT — pick the outlier, THEN pick why.
   The second half is the point and the bit nobody else does. Right answer for the
   wrong reason scores 50, which is exactly the distinction a teacher cares about.

   THE RULE, and it is not optional: exactly ONE reason may be true. Seven of the
   first twelve questions here shipped with two or three true reasons — "the Pyramids
   are the only one not on the modern wonders list" was the key, but "the only one in
   Africa" was equally true, so the player was punished for being right.
   `trueCount` records the hand-check. validate.js refuses anything but 1. */
export const ODD = [
  { id:'d1', prompt:'Which does not belong?', trueCount:1,
    items:['Tomato','Cucumber','Pumpkin','Lettuce'], odd:3,
    reasons:['It is the only one that is not botanically a fruit',   // TRUE
             'It is the only one that grows underground',            // false — none do
             'It is the only one that is green',                     // false — cucumber
             'It is the only one you can eat raw'], reason:0,        // false — all raw
    source:'Royal Horticultural Society / botanical classification',
    theme:'food',
    note:'Tomato, cucumber and pumpkin all grow from a flower and carry seeds, so all three are fruit. Lettuce is a leaf.' },

  { id:'d2', prompt:'Which does not belong?', trueCount:1,
    items:['Mercury','Venus','Earth','Jupiter'], odd:3,
    reasons:['It is the only one without a solid surface',           // TRUE
             'It is the only one closer to the Sun than Earth',      // false — Mercury, Venus
             'It is the only one with no moons',                     // false — Jupiter has ~95
             'It is the only one named after a Roman god'], reason:0,// false — all four are
    source:'NASA planetary fact sheets',
    theme:'planets',
    note:'Jupiter is a gas giant — there is no surface to stand on. The other three are rocky planets.' },

  { id:'d3', prompt:'Which does not belong?', trueCount:1,
    items:['Whale','Bat','Penguin','Dolphin'], odd:2,
    reasons:['It is the only one that cannot swim',                  // false — penguins swim superbly
             'It is the only bird — the rest are mammals',           // TRUE
             'It is the only one with no bones',                     // false — all have bones
             'It is the only one that eats fish'], reason:1,         // false — all four do
    source:'Smithsonian National Museum of Natural History',
    theme:'sealife',
    note:'Bats are mammals that fly; penguins are birds that swim. The split is mammal versus bird, not air versus water.' },

  { id:'d4', prompt:'Which does not belong?', trueCount:1,
    items:['HTTP','FTP','TCP','SMTP'], odd:2,
    reasons:['It is the only one that is not encrypted by default',  // false — FTP and SMTP are plain too
             'It is the only transport-layer protocol — the rest sit on top of it', // TRUE
             'It is the only one no longer in use',                  // false — TCP runs everything
             'It is the only one that is not an acronym'], reason:1, // false — all are
    source:'IETF RFC 793 / RFC 9110',
    theme:'tech',
    note:'TCP moves the bytes; HTTP, FTP and SMTP are things you say over it. A different layer, not a different purpose.' },

  { id:'d5', prompt:'Which does not belong?', trueCount:1,
    items:['Diamond','Graphite','Soot','Quartz'], odd:3,
    reasons:['It is the only one that is not pure carbon',           // TRUE
             'It is the only one that is transparent',               // false — diamond is
             'It is the only one that is hard',                      // false — diamond is harder
             'It is the only one that occurs naturally'], reason:0,  // false — all four do
    source:'Mineralogical Society of America',
    theme:'warming',
    note:'Diamond, graphite and soot are all pure carbon arranged differently. Quartz is silicon dioxide.' },

  { id:'d6', prompt:'Which does not belong?', trueCount:1,
    items:['Mandarin','Hindi','Swahili','Spanish'], odd:2,
    reasons:['It is the only one outside the world’s top ten by native speakers', // TRUE
             'It is the only one written in the Latin alphabet',     // false — Spanish is too
             'It is the only tonal language',                        // false — Mandarin is tonal, Swahili is not
             'It is the only official language of a country'], reason:0, // false — all four are
    source:'Ethnologue',
    theme:'demography',
    note:'Swahili has around 18 million native speakers against hundreds of millions each for the others. It is enormous as a SECOND language.' },

  { id:'d7', prompt:'Which does not belong?', trueCount:1,
    items:['Sun','Moon','Mars','Venus'], odd:1,
    reasons:['It is the only one that does not orbit the Sun',       // TRUE
             'It is the only one that makes its own light',          // false — that is the Sun
             'It is the only one that is not a planet',              // false — the Sun is not either
             'It is the only one visible without a telescope'], reason:0, // false — all four are
    source:'NASA solar system overview',
    theme:'planets',
    note:'The Moon orbits Earth. Mars and Venus orbit the Sun, and the Sun is the thing being orbited.' },

  { id:'d8', prompt:'Which does not belong?', trueCount:1,
    items:['Python','Java','HTML','C++'], odd:2,
    reasons:['It is the only one that is a markup language, not a programming language', // TRUE
             'It is the only one that is not compiled',              // false — Python is interpreted too
             'It is the only one named after an animal',             // false — Python is
             'It is the only one created after 2000'], reason:0,     // false — all predate 2000
    source:'W3C HTML specification',
    theme:'animals',
    note:'HTML describes structure. It has no conditions and no loops, so it cannot express logic — which is what makes a language a programming language.' },

  { id:'d9', prompt:'Which does not belong?', trueCount:1,
    items:['Tsunami','Hurricane','Earthquake','Volcano'], odd:1,
    reasons:['It is the only one not caused by movement inside the Earth', // TRUE
             'It is the only one that happens at sea',               // false — tsunamis begin at sea
             'It is the only one measured on a numbered scale',      // false — earthquakes have Richter
             'It is the only one that causes flooding'], reason:0,   // false — tsunamis flood
    source:'US Geological Survey / NOAA',
    theme:'space',
    note:'Hurricanes are weather, driven by warm ocean and air. The other three are geology.' },

  { id:'d10', prompt:'Which does not belong?', trueCount:1,
    items:['Gold','Silver','Iron','Copper'], odd:2,
    reasons:['It is the only one that rusts',                        // TRUE
             'It is the only one used in coins',                     // false — all four have been
             'It is the only one that conducts electricity',         // false — all do
             'It is the only one that is a metal'], reason:0,        // false — all four are
    source:'Royal Society of Chemistry',
    theme:'animals',
    note:'Only iron rusts, which needs iron plus oxygen plus water. The others corrode differently, or barely at all.' },

  { id:'d11', prompt:'Which does not belong?', trueCount:1,
    items:['Great Wall of China','Pyramids of Giza','Colosseum','Taj Mahal'], odd:1,
    reasons:['It is the only one not on the New Seven Wonders list', // TRUE
             'It is the only one that is a tomb',                    // false — the Taj Mahal is a tomb
             'It is the only one outside Europe',                    // false — Great Wall and Taj are in Asia
             'It is the only one still standing'], reason:0,         // false — all four stand
    source:'New7Wonders Foundation / UNESCO',
    theme:'food',
    note:'The Pyramids are the only surviving wonder of the ANCIENT list, which is exactly why they were held back from the modern vote.' },

  { id:'d12', prompt:'Which does not belong?', trueCount:1,
    items:['Wi-Fi','Bluetooth','Ethernet','5G'], odd:2,
    reasons:['It is the only one that needs a cable',                // TRUE
             'It is the only one that is not an open standard',      // false — Ethernet is IEEE 802.3
             'It is the only one invented this century',             // false — Ethernet dates to 1973
             'It is the only one that can be encrypted'], reason:0,  // false — all can be
    source:'IEEE 802.3 and 802.11 standards',
    theme:'inventions',
    note:'Ethernet is wired, which is why it is the only one of the four immune to interference from a microwave oven.' },

  { id:'d13', prompt:'Which does not belong?', trueCount:1,
    items:['Strawberry','Raspberry','Blackberry','Banana'], odd:3,
    reasons:['It is the only one that is botanically a berry',       // TRUE — bananas are berries, the others are not
             'It is the only one that is not red',                   // false — blackberries are not red
             'It is the only one that grows on a tree',              // false — bananas grow on a giant herb
             'It is the only one with seeds on the outside'], reason:0, // false — that is the strawberry
    source:'Royal Horticultural Society, botanical fruit definitions',
    theme:'nutrition',
    note:'Botanically a banana IS a berry and a strawberry is not. The everyday word and the botanical one disagree almost completely.' },

  { id:'d14', prompt:'Which does not belong?', trueCount:1,
    items:['Greenland','New Guinea','Borneo','Australia'], odd:3,
    reasons:['It is the only one classed as a continent rather than an island', // TRUE
             'It is the only one in the southern hemisphere',        // false — New Guinea and Borneo straddle it
             'It is the only one with no land border',               // false - Greenland and Borneo... Borneo has three
             'It is the only one with a desert'], reason:0,          // false - Greenland is a polar desert
    source:'Encyclopaedia Britannica, continents and islands',
    theme:'demography',
    note:'Australia is the largest landmass that counts as a continent, which is precisely why Greenland gets to be called the largest island.' },

  { id:'d15', prompt:'Which does not belong?', trueCount:1,
    items:['Instagram','WhatsApp','TikTok','Threads'], odd:2,
    reasons:['It is the only one not owned by Meta',
             'It is the only one with video',
             'It is the only one that is free',
             'It is the only one with private messaging'], reason:0,
    source:'Corporate ownership',
    theme:'social',
    note:'TikTok is ByteDance. Instagram, WhatsApp and Threads are all Meta — which is why they keep growing features into each other.' },
  { id:'d16', prompt:'Which does not belong?', trueCount:1,
    items:['Tomato','Potato','Aubergine','Chilli'], odd:1,
    reasons:['It is the only one where we eat the underground part',
             'It is the only one in the nightshade family',
             'It is the only one that is not a fruit',
             'It is the only one native to Asia'], reason:0,
    source:'Botany',
    theme:'food',
    note:'All four are nightshades. The potato is the only one where the edible part grows underground — and its leaves are toxic.' },
  { id:'d17', prompt:'Which does not belong?', trueCount:1,
    items:['Mercury','Helium','Neon','Argon'], odd:0,
    reasons:['It is the only one that is liquid at room temperature',
             'It is the only one that is a gas',
             'It is the only one used in lighting',
             'It is the only one named after a planet'], reason:0,
    source:'Chemistry',
    theme:'planets',
    note:'Mercury is the only metal that is liquid at room temperature. The other three are noble gases — and all four have been used in lamps.' },
  { id:'d18', prompt:'Which does not belong?', trueCount:1,
    items:['Pacific','Atlantic','Mediterranean','Indian'], odd:2,
    reasons:['It is the only sea rather than an ocean',
             'It is the only one in the northern hemisphere',
             'It is the only one bordered by Europe',
             'It is the only saltwater one'], reason:0,
    source:'International Hydrographic Organization, Limits of Oceans and Seas',
    theme:'oceans',
    note:'The Mediterranean is a sea — almost enclosed, connected to the Atlantic by a 14 km gap at Gibraltar.' },
  { id:'d19', prompt:'Which does not belong?', trueCount:1,
    items:['Bitcoin','Ethereum','Visa','Dogecoin'], odd:2,
    reasons:['It is the only one that is a company rather than a currency',
             'It is the only one you can spend in shops',
             'It is the only one that is regulated',
             'It is the only one older than 2010'], reason:0,
    source:'Bank for International Settlements / CoinMarketCap',
    theme:'economy',
    note:'Visa is a payment network — it issues nothing. The other three are currencies with no company behind them.' },
  { id:'d20', prompt:'Which does not belong?', trueCount:1,
    items:['Everest','K2','Denali','Kilimanjaro'], odd:3,
    reasons:['It is the only one that is a volcano',              // TRUE
             'It is the only one over 8,000 metres',               // false - Everest and K2 both are
             'It is the only one ever climbed',                    // false - all four have been
             'It is the only one first climbed in the 20th century'], reason:0,  // false - Kilimanjaro was 1889
    // "the only one outside Asia" was worse than false: Denali is outside Asia too,
    // so the statement singled out nobody and made Denali look defensible.
    source:'Encyclopaedia Britannica / Royal Geographical Society',
    theme:'geography',
    note:'Kilimanjaro is a dormant volcano, and the only one of the four you can walk up without technical climbing.' },

  { id:'d21', prompt:'Which does not belong?', trueCount:1,
    items:['Diamond','Pearl','Amber','Ruby'], odd:0,
    reasons:['It is the only one that is not made by a living thing or from one',
             'It is the only one that is transparent',
             'It is the only one used in jewellery',
             'It is the only one that is hard'], reason:0,
    source:'Gemological Institute of America',
    theme:'fossil',
    note:'Pearls come from molluscs, amber is fossil tree resin, and rubies form around organic carbon traces. Diamond is pure geology.' },
  { id:'d22', prompt:'Which does not belong?', trueCount:1,
    items:['Lightning','Aurora','Rainbow','Earthquake'], odd:3,
    reasons:['It is the only one that is not an atmospheric phenomenon',
             'It is the only one you can hear',
             'It is the only one that is dangerous',
             'It is the only one that happens at night'], reason:0,
    source:'NOAA / US Geological Survey',
    theme:'misc',
    note:'Three happen in the air; an earthquake happens in rock. Lightning is also audible, which is why that distractor fails.' },
  { id:'d23', prompt:'Which does not belong?', trueCount:1,
    items:['Linux','Android','Windows','iOS'], odd:2,
    reasons:['It is the only one not built on a Unix-like core',
             'It is the only one that is not free',
             'It is the only one used on phones',
             'It is the only one made by one company'], reason:0,
    source:'Operating system architecture documentation',
    theme:'devices',
    note:'Android is Linux and iOS descends from BSD Unix. Windows NT was built from scratch on a different design entirely.' },
  { id:'d24', prompt:'Which does not belong?', trueCount:1,
    items:['Saturn','Jupiter','Uranus','Earth'], odd:3,
    reasons:['It is the only one without rings',
             'It is the only one with a moon',
             'It is the only one with an atmosphere',
             'It is the only one that rotates'], reason:0,
    source:'NASA planetary fact sheets',
    theme:'moonsun',
    note:'All four giants have rings — Jupiter and Uranus just have faint ones. Only Earth has none at all.' },
  { id:'d25', prompt:'Which does not belong?', trueCount:1,
    items:['Peanut','Almond','Walnut','Cashew'], odd:0,
    reasons:['It is the only one that grows underground',
             'It is the only one that causes allergies',
             'It is the only one that is not a nut botanically',
             'It is the only one eaten roasted'], reason:0,
    source:'Royal Horticultural Society',
    theme:'nutrition',
    note:'Peanuts grow underground and are legumes, like peas. But almonds and cashews are not true nuts either, which is why that reason fails.' },
  { id:'d26', prompt:'Which does not belong?', trueCount:1,
    items:['Euro','Dollar','Bitcoin','Yen'], odd:2,
    reasons:['It is the only one not issued by a central bank',
             'It is the only one you can spend online',
             'It is the only one that changes value',
             'It is the only one used outside its home country'], reason:0,
    source:'Bank for International Settlements',
    theme:'web',
    note:'No central bank, no issuer, no country. Every other distractor here is true of all four.' },
  { id:'d27', prompt:'Which does not belong?', trueCount:1,
    items:['Venus','Mercury','Mars','Moon'], odd:3,
    reasons:['It is the only one that is not a planet',
             'It is the only one without an atmosphere',
             'It is the only one humans have reached',
             'It is the only one smaller than Earth'], reason:0,
    source:'NASA solar system overview',
    theme:'planets',
    note:'The Moon is a satellite. It is also the only one we have walked on — but that is a second true fact about it, so the reason has to be the classification.' },
  { id:'d28', prompt:'Which does not belong?', trueCount:1,
    items:['Marathon','Sprint','Triathlon','Decathlon'], odd:1,
    reasons:['It is the only one that is a single event rather than a distance or a combination',
             'It is the only one in the Olympics',
             'It is the only one that involves running',
             'It is the only one with a world record'], reason:0,
    source:'World Athletics / International Olympic Committee',
    theme:'sport',
    note:'Marathon is a distance, triathlon and decathlon are combinations of events. Sprint is just a way of running.' },
  { id:'d29', prompt:'Which does not belong?', trueCount:1,
    items:['Coal','Oil','Uranium','Gas'], odd:2,
    reasons:['It is the only one that is not a fossil fuel',
             'It is the only one that is mined',
             'It is the only one used to make electricity',
             'It is the only one that runs out'], reason:0,
    source:'US Energy Information Administration',
    theme:'fossil',
    note:'Uranium is a metal, not ancient biology. All four are mined, all four generate electricity, and all four are finite.' },
  { id:'d30', prompt:'Which does not belong?', trueCount:1,
    items:['Himalayas','Andes','Alps','Sahara'], odd:3,
    reasons:['It is the only one that is not a mountain range',
             'It is the only one in Africa',
             'It is the only one that is hot',
             'It is the only one people live in'], reason:0,
    source:'National Geographic atlas',
    theme:'demography',
    note:'The Sahara is a desert — and it has mountains in it, including peaks over 3,000 metres.' },

  { id:'in-d1', prompt:'Which does not belong?', trueCount:1,
    items:['Ganga','Yamuna','Godavari','Thar'], odd:3,
    reasons:['It is the only one that is not a river',
             'It is the only one in northern India',
             'It is the only one that is sacred',
             'It is the only one that reaches the sea'], reason:0,
    source:'Survey of India', theme:'india-geo', region:'india',
    note:'The Thar is a desert. The Godavari is sometimes called the Dakshina Ganga — the Ganga of the south.' },
  { id:'in-d2', prompt:'Which does not belong?', trueCount:1,
    items:['Mumbai','Chennai','Kolkata','Jaipur'], odd:3,
    reasons:['It is the only one that is not a port city',
             'It is the only one that is a state capital',
             'It is the only one founded after 1700',
             'It is the only one with a metro'], reason:0,
    source:'Census of India', theme:'india-cities', region:'india',
    note:'Jaipur is inland. The other three were all built up as ports — which is why the British made them presidency capitals.' },
  { id:'in-d3', prompt:'Which does not belong?', trueCount:1,
    items:['Diwali','Holi','Onam','Monsoon'], odd:3,
    reasons:['It is the only one that is not a festival',
             'It is the only one celebrated nationwide',
             'It is the only one with a fixed date',
             'It is the only one involving food'], reason:0,
    source:'India Meteorological Department', theme:'india-culture', region:'india',
    note:'The monsoon is weather, not a festival — though Onam is timed around its end in Kerala.' },
  { id:'in-d4', prompt:'Which does not belong?', trueCount:1,
    items:['Rupee','Taka','Yen','Rupiah'], odd:2,
    reasons:['It is the only one not used in South or Southeast Asia',
             'It is the only one that is not a decimal currency',
             'It is the only one with coins',
             'It is the only one traded internationally'], reason:0,
    source:'International Monetary Fund', theme:'india-money', region:'india',
    note:'The yen is Japanese. Rupee, taka and rupiah all descend from the same Sanskrit root for wrought silver.' },
  { id:'in-d5', prompt:'Which does not belong?', trueCount:1,
    items:['Kohli','Dhoni','Tendulkar','Bachchan'], odd:3,
    reasons:['It is the only one who is not a cricketer',
             'It is the only one from Mumbai',
             'It is the only one still working',
             'It is the only one who has won a World Cup'], reason:0,
    source:'ESPNcricinfo / IMDb', theme:'india-cricket', region:'india',
    note:'Amitabh Bachchan is an actor. Tendulkar is also from Mumbai, which is why that distractor fails.' },

  { id:'in-d6', prompt:'Which does not belong?', trueCount:1,
    items:['Mumbai','Chennai','Kolkata','Delhi'], odd:3,
    reasons:['It is the only one not on the coast',                 // TRUE
             'It is the only one that is a state capital',          // false - all four are
             'It is the only one with a metro system',              // false - all four have one
             'It is the only one with over 10 million people'],     // false - all four do
    reason:0, source:'Census of India', theme:'india-cities', region:'india',
    note:'Delhi is the only landlocked one \u2014 and the only one that grew as a seat of power rather than a port.' },
  { id:'in-d7', prompt:'Which does not belong?', trueCount:1,
    items:['Hindi','Bengali','Marathi','Sanskrit'], odd:3,
    reasons:['It is the only one with virtually no native speakers today',  // TRUE
             'It is the only one written in Devanagari',                    // false - Hindi, Marathi too
             'It is the only one in the Constitution\u2019s Eighth Schedule', // false - all four are
             'It is the only one spoken outside India'],                    // false - Bengali, in Bangladesh
    reason:0, source:'Census of India language tables', theme:'india-lang', region:'india',
    note:'Sanskrit is listed as an official language and returned under 25,000 native speakers in the last census.' },
  { id:'in-d8', prompt:'Which does not belong?', trueCount:1,
    items:['Chandrayaan-3','Mangalyaan','Aditya-L1','Gaganyaan'], odd:3,
    reasons:['It is the only one meant to carry people',   // TRUE
             'It is the only one that reached the Moon',   // false - Chandrayaan-3 did
             'It is the only one built by ISRO',           // false - all four are
             'It is the only one announced after 2020'],   // false - all were announced earlier
    reason:0, source:'ISRO mission pages', theme:'india-space', region:'india',
    note:'Gaganyaan is India\u2019s crewed programme. The other three carried instruments and nothing else.' },
  { id:'in-d9', prompt:'Which does not belong?', trueCount:1,
    items:['Ganga','Yamuna','Godavari','Brahmaputra'], odd:3,
    reasons:['It is the only one that rises outside India',    // TRUE - it rises in Tibet
             'It is the only one over 1,000 km long',          // false - all four are
             'It is the only one that reaches the sea',        // false - Ganga and Godavari do
             'It is the only one that is a tributary'],        // false - that is the Yamuna
    reason:0, source:'Central Water Commission', theme:'india-geo', region:'india',
    note:'The Brahmaputra starts in Tibet as the Yarlung Tsangpo and only becomes the Brahmaputra in Assam.' }
];
