/* Game type 7 of 7: SHADOW — four silhouettes, one question, no words to read.

   The most purely visual mode: the ANSWERS carry no text at all, so the whole
   question is a picture problem. It also means a player who struggles with reading
   or with English can still play, which the other six modes cannot claim.
   Keys refer to silhouettes.js. */
export const SHADOW = [
  { id:'h1', prompt:'Which of these lives the longest?',
    options:['mouse','dog','horse','tortoise'], answer:3,
    source:'AnAge database, Human Ageing Genomic Resources',
    theme:'bugs',
    note:'A giant tortoise can pass 150 years. The mouse beside it gets about two.' },
  { id:'h2', prompt:'Which is the heaviest animal?',
    options:['elephant','whale','shark','horse'], answer:1,
    source:'NOAA Fisheries',
    theme:'sealife',
    note:'A blue whale is around 150 tonnes — twenty-five elephants, and the largest animal that has ever existed.' },
  { id:'h3', prompt:'Which is the fastest?',
    options:['cheetah','horse','falcon','human'], answer:2,
    source:'Natural History Museum',
    theme:'birds',
    note:'A peregrine falcon dives at about 390 km/h. The cheetah, the fastest thing on land, manages 110.' },
  { id:'h4', prompt:'Which one of these is a bird?',
    options:['penguin','shark','whale','mouse'], answer:0,
    source:'Smithsonian National Museum of Natural History',
    theme:'sealife',
    note:'Penguins are birds that swim instead of flying. Whales are mammals and sharks are fish.' },
  { id:'h5', prompt:'Which one is NOT a mammal?',
    options:['whale','dog','shark','elephant'], answer:2,
    source:'Smithsonian National Museum of Natural History',
    theme:'sealife',
    note:'Whales breathe air and feed their young on milk. A shark does neither — it is a fish.' },
  { id:'h6', prompt:'Which was invented first?',
    options:['bicycle','car','plane','rocket'], answer:0,
    source:'Encyclopaedia Britannica, history of transport',
    theme:'missions',
    note:'The bicycle, by about twenty years. The pedal bicycle came in the 1860s; the car in 1886. Count from the 1817 running machine and the gap is nearer seventy.' },
  { id:'h7', prompt:'Which produces the least CO2 per passenger-kilometre?',
    options:['car','bus','train','bicycle'], answer:3,
    source:'International Energy Agency',
    theme:'rail',
    note:'Zero from the bicycle. It is the most energy-efficient form of transport ever invented, including walking.' },
  { id:'h8', prompt:'Which of these is tallest?',
    options:['human','house','tree','mountain'], answer:3,
    source:'USGS / Guinness World Records (tallest tree)',
    theme:'food',
    note:'Not close. Everest is about 5,000 times a person — but the tallest tree, at 116 m, beats most buildings.' },
  { id:'h9', prompt:'Which came first?',
    options:['book','clock','lightbulb','phone'], answer:0,
    source:'Encyclopaedia Britannica, history of technology',
    theme:'devices',
    note:'Books by a long way — bound manuscripts predate the mechanical clock by over a thousand years.' },
  { id:'h10', prompt:'Which carries the most people in one journey?',
    options:['car','bus','train','plane'], answer:2,
    source:'UIC railway statistics / Airbus specifications',
    theme:'aviation',
    note:'A commuter train can carry well over a thousand. The largest airliner carries about 850.' },
  { id:'h11', prompt:'Which of these weighs the most?',
    options:['horse','car','elephant','bus'], answer:3,
    source:'Manufacturer kerb weights / zoological records',
    theme:'bugs',
    note:'A city bus is about 12 tonnes — twice an elephant and eight times a car.' },
  { id:'h12', prompt:'Which of these is heaviest?',
    // Was cat / chicken / rabbit / dog. A chihuahua weighs under 3 kg and a
    // Maine Coon reaches 11, so the answer depended on which dog you pictured.
    options:['mouse','chicken','rabbit','dog'], answer:3,
    source:'American Kennel Club / zoological records',
    theme:'birds',
    note:'A medium dog is about 30 kg — six times a house cat and fifteen times a chicken.' },
  { id:'h13', prompt:'Which can see best in near-total darkness?',
    options:['human','cat','chicken','rabbit'], answer:1,
    source:'Journal of Experimental Biology, feline vision',
    theme:'birds',
    note:'A cat needs about a sixth of the light we do. Chickens are the opposite — nearly blind at night, which is why they roost at dusk.' },
  { id:'h14', prompt:'Which of these is the oldest form of transport?',
    options:['bicycle','horse','train','car'], answer:1,
    source:'Outram et al., Science 2009 (horse domestication)',
    theme:'wildlife',
    note:'Humans were riding horses around 5,500 years ago. Every other option here is younger than 1800.' },
  { id:'h15', prompt:'Which one of these is a fish?',
    options:['whale','shark','penguin','human'], answer:1,
    source:'Smithsonian National Museum of Natural History',
    theme:'sealife',
    note:'Only the shark. The other three are warm-blooded air-breathers that happen to be good at swimming.' },

  /* Was "which of these would float in water?" with an elephant on screen.
     Elephants float and swim for miles, so there were two correct answers. Asked
     about SINKING instead, where only one option is dense enough. */
  { id:'h16', prompt:'Which of these sinks fastest in water?',
    options:['elephant','whale','car','bottle'], answer:2,
    source:'Vehicle kerb weights / mammal body density studies', theme:'missions',
    note:'A car. Whales and elephants are close to the density of water \u2014 both float and swim. A sealed bottle floats. Steel does not.' },
  /* Was "loudest underwater" against a plane and a car, which compares an
     underwater decibel reference to an airborne one — two different scales. Now
     all four are things that actually make noise in the sea. */
  { id:'h27', prompt:'Which of these is the loudest animal in the ocean?',
    options:['whale','shark','dolphin','penguin'], answer:0,
    source:'NOAA Ocean Noise Reference Station', theme:'sealife',
    note:'A blue whale reaches 188 decibels (underwater reference) and can be heard 800 km away. Sharks make almost no sound at all.' },
  /* Asked "which existed before the dinosaurs?" and accepted only the shark.
     Trees did too — the first forests stood in the Devonian, about 385 million
     years ago, and the dinosaurs arrived around 230. Two right answers, one of
     them scored. The note was already answering the question the ANSWER fits
     ("sharks predate trees"), so the prompt is the part that was wrong. */
  { id:'h28', prompt:'Which of these has been around the longest?',
    options:['tree','shark','rabbit','horse'], answer:1, source:'Natural History Museum, fossil record',
    theme:'sealife',
    note:'Sharks, by a long way: 450 million years, against 385 for the first trees and 230 for the first dinosaurs.' },
  { id:'h29', prompt:'Which of these uses the most electricity in a year?',
    options:['phone','lightbulb','clock','drop'], answer:1, source:'US Department of Energy appliance data',
    theme:'devices',
    note:'A single old incandescent bulb outdraws a phone charged daily for a year by roughly thirty times.' },
  /* Was "which is NOT a vegetable, botanically?" with both an apple and a banana
     on screen - two correct answers, and the note said so itself. Re-pointed at a
     distinction with exactly one right answer, which is also the more surprising
     fact: a banana is a berry and an apple is not. */
  { id:'h30', prompt:'Which of these is botanically a BERRY?',
    options:['tree','leaf','apple','banana'], answer:3, source:'Royal Horticultural Society',
    theme:'nutrition',
    note:'A banana is a berry. An apple is a pome \u2014 it grows from the flower\u2019s base, not from a single ovary. Botany and the greengrocer rarely agree.' },
  { id:'h31', prompt:'Which of these replaces its teeth constantly?',
    options:['cat','tortoise','shark','mouse'], answer:2, source:'Journal of Fish Biology',
    theme:'sealife',
    note:'Sharks regrow teeth constantly — up to 50,000 in a lifetime — and heal wounds that would kill a mammal.' },
  { id:'h32', prompt:'Which of these came first?',
    options:['bicycle','train','car','plane'], answer:1, source:'Encyclopaedia Britannica, history of rail',
    theme:'aviation',
    note:'The steam locomotive, 1804 — four decades before the pedal bicycle and eighty years before the car.' },
  { id:'h33', prompt:'Which of these is heaviest for its size?',
    options:['crown','leaf','apple','book'], answer:0, source:'Royal Society of Chemistry, metal densities',
    theme:'drinks',
    note:'Gold is 19 times denser than water. A gold crown the size of an apple would weigh about 3 kg.' },
  { id:'h34', prompt:'Which of these hears the highest pitch?',
    options:['human','cat','elephant','dog'], answer:1, source:'Journal of the Acoustical Society of America',
    theme:'bugs',
    note:'A cat hears up to 64 kHz — three octaves above us. Elephants work at the other end, below human hearing.' },
  { id:'h35', prompt:'Which of these went to space first?',
    options:['cat','dog','horse','cheetah'], answer:1, source:'NASA / Smithsonian space history',
    theme:'missions',
    note:'Both, in fact — a Soviet dog called Laika in 1957, then a French cat called Félicette in 1963. The dog went first, and is the one everyone remembers.' },
  { id:'h36', prompt:'Which of these holds the most water?',
    options:['bottle','cup','drop','tree'], answer:3, source:'US Forest Service',
    theme:'icewater',
    note:'A full-grown tree lifts about 150 litres a day up its trunk, with no pump.' },
  { id:'h37', prompt:'Which of these is older than the pyramids?',
    options:['tree','house','book','clock'], answer:0, source:'Rocky Mountain Tree-Ring Research',
    theme:'ancient',
    note:'The oldest living bristlecone pine is about 4,850 years old — it was already a sapling when Giza was built.' },
  { id:'h38', prompt:'Which of these would you weigh least standing on?',
    options:['earth','moon','sun','mountain'], answer:1, source:'NASA planetary fact sheets',
    theme:'planets',
    note:'One sixth of your Earth weight on the Moon. On the Sun you would weigh 28 times more, briefly.' },
  /* REMOVED from the bank, not patched, because the stated answer is wrong and
     no small edit rescues it.

     "Which is NOT powered by the Sun, ultimately?" answered 'rocket', on the
     note "rocket fuel is chemistry, not photosynthesis". Most orbital rockets
     burn RP-1, which is refined kerosene — ancient sunlight, exactly like the
     petrol the same note calls solar. The answer is defensible only for solid
     propellant, and the question does not say which kind of rocket.

     The honestly non-solar sources are nuclear, geothermal and tidal, and none
     of them has an icon in this set, so the question cannot be repaired by
     swapping an option. It needs a replacement written for it — a content job,
     flagged rather than bodged. Left here so the next author sees the reasoning
     instead of re-adding it.

  { id:'h39', prompt:'Which of these is NOT powered by the Sun, ultimately?',
    options:['tree','bicycle','car','rocket'], answer:3, ... }
  */
  /* Replaces h39 (removed above). Same theme, and the answer survives the test
     h39 failed: exactly one option is defensible. The Moon, the Earth and a
     mountain are all lit by something else; a star is the only thing here that
     makes its own light. Removing a question without replacing it is not free —
     the shadow bank is the thinnest in the game and dropping to 41 broke the
     no-consecutive-repeat guarantee at day 416. */
  { id:'h46', prompt:'Which of these would still shine if the Sun went out?',
    options:['moon','star','earth','mountain'], answer:1, source:'NASA, stellar physics',
    theme:'moonsun',
    note:'The Moon has no light of its own — it is a mirror. Other stars make their own, so the night sky would not go fully dark.' },
  { id:'h40', prompt:'Which of these travels furthest on one unit of energy?',
    options:['bicycle','car','plane','motorcycle'], answer:0, source:'International Energy Agency',
    theme:'aviation',
    note:'The bicycle, by a wide margin — and it beats walking too. It is the most efficient machine ever built for moving a human.' },

  { id:'in-h1', prompt:'Which of these costs the least in India?',
    options:['curry','cricket','phone','auto'], answer:0,
    source:'Consumer price surveys', theme:'india-food', region:'india',
    note:'A plate of street food runs ₹40-60. A cricket bat starts near ₹1,500 and a phone at ₹7,000.' },
  { id:'in-h2', prompt:'Which of these is India\u2019s national animal?',
    options:['elephant','tiger','cat','horse'], answer:1,
    source:'Ministry of Environment, Forest and Climate Change', theme:'india-wildlife', region:'india',
    note:'The Bengal tiger. India holds about 75% of the world\u2019s remaining wild tigers — roughly 3,600 of them.' },
  { id:'in-h3', prompt:'Which of these moves the most people in India every day?',
    options:['train','auto','bus','bicycle'], answer:2,
    source:'MoRTH Road Transport Yearbook / Indian Railways Year Book', theme:'india-rail', region:'india',
    note:'Buses, by a wide margin — roughly 70 million journeys a day against about 24 million by rail. The trains get the photographs; the buses do the work.' },
  /* Asked "which is oldest?" and took only the Taj Mahal (1653). Cricket is
     first recorded in 1597, so cricket was equally right and scored nothing.
     The NOTE was already answering the narrower question — "before cricket
     reached the country at all" — so the prompt was the half that was wrong,
     exactly as in h28. In India: Taj Mahal 1653, cricket arrives in the 1720s,
     the first train 1853. (Region-tagged, so no player is dealt it today.) */
  { id:'in-h4', prompt:'Which of these is oldest in India?',
    options:['tajmahal','train','phone','cricket'], answer:0,
    source:'Archaeological Survey of India', theme:'india-ancient', region:'india',
    note:'The Taj Mahal was finished in 1653 — two centuries before India\u2019s first train in 1853, and before cricket reached the country at all.' },
  /* Asked which India grows more of than anyone else and accepted only the
     mango. India is also the world's largest banana producer — about a quarter
     of the global crop — so banana was equally right and scored nothing. The
     note already named the thing that IS unique: roughly half of all mangoes.
     The prompt now asks for that. (This one is region-tagged, so no player is
     dealt it today; it would have shipped with the India pack.) */
  { id:'in-h5', prompt:'India grows about HALF the world\u2019s supply of which of these?',
    options:['mango','apple','banana','leaf'], answer:0,
    source:'UN Food and Agriculture Organization', theme:'india-farming', region:'india',
    note:'India grows about half the world\u2019s mangoes — and exports barely 1% of them. Almost all are eaten at home.' },
  { id:'in-h6', prompt:'Which is most used for payments in India today?',
    options:['phone','rupee','crown','key'], answer:0,
    source:'Reserve Bank of India', theme:'india-money', region:'india',
    note:'UPI on a phone. India went from cash to phone payments without most people ever owning a credit card.' },

  { id:'in-h7', prompt:'Which of these is heaviest?',
    options:['mango','cricket','auto','elephant'], answer:3,
    source:'Vehicle and wildlife specifications', theme:'india-wildlife', region:'india',
    note:'An Indian elephant is about 4,000 kg \u2014 roughly eleven auto-rickshaws, which weigh about 350 kg each.' },
  { id:'in-h8', prompt:'Which of these weighs the least?',
    options:['diya','mango','cricket','auto'], answer:0,
    source:'Consumer product specifications', theme:'india-culture', region:'india',
    note:'A clay diya is about 50 g. A mango is 250 g, a cricket bat 1.2 kg, an auto-rickshaw 350 kg.' },

  { id:'h41', prompt:'Which of these is fastest over 100 metres?',
    options:['cheetah','horse','human','elephant'], answer:0,
    source:'Journal of Experimental Biology', theme:'animals',
    note:'A cheetah covers 100 m in about 5.8 seconds. Usain Bolt took 9.58.' },
  /* Was a second "holds the most water?" with three of the same four pictures as
     h36 — the linter compared option SETS, which differed by one item, so it
     passed while reading to a player as the same question asked twice. */
  { id:'h42', prompt:'Which of these was invented in India?',
    options:['cricket','temple','rocket','diya'], answer:3,
    source:'Archaeological Survey of India', theme:'india-ancient', region:'india',
    note:'Oil lamps have been lit here for 5,000 years. Cricket is English, rockets Chinese \u2014 though Mysore weaponised them first.' },
  { id:'h43', prompt:'Which of these came last?',
    options:['rocket','camera','guitar','key'], answer:0,
    source:'Encyclopaedia Britannica, history of invention', theme:'inventions',
    note:'Keys are 6,000 years old, guitars 500, cameras 200. The first rocket to reach space flew in 1944.' },
  { id:'h44', prompt:'Which of these does India grow the most of?',
    options:['mango','spice','curry','diya'], answer:0,
    source:'FAO production statistics', theme:'india-farming', region:'india',
    note:'India grows about half the world\u2019s mangoes \u2014 some 25 million tonnes a year.' },
  { id:'h45', prompt:'Which of these is coldest at night?',
    // "Coldest" alone was wrong: the Moon's DAY side reaches 127 C, hotter than
    // anywhere on Earth. The night side is the -173 C the note talks about, so
    // the question now asks what the answer actually measures.
    options:['moon','sun','earth','star'], answer:0,
    source:'NASA planetary fact sheets', theme:'moonsun',
    note:'The Moon\u2019s night side reaches \u2212173\u00b0C, and its day side +127\u00b0C. With no atmosphere there is nothing to carry heat from one to the other.' },
];
