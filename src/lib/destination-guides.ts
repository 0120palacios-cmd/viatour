// "Qué hacer en su destino": curated editorial content for Mi viaje, written by the agency and reviewed
// before publishing (see docs/mi-viaje-premium.md). Nothing here is generated at runtime, and no entry
// carries prices, opening hours, availability, ratings or guarantees: those change and are confirmed by
// the advisor. Facts were checked against official tourism and attraction websites on 2026-10-22.
//
// Photos are real, licensed photographs served by the site itself (public/destinos/...); their author and
// license are in data/trip-photo-credits.json (and data/panama-photo-credits.json for Panamá), shown in
// "Créditos de las fotos" under the destination. A link is only given when it is the attraction's or the
// destination's official website, checked to load on that date.
//
// Pure, so it can be tested without a database. To add a destination, add one entry; a trip whose
// destination has no entry simply shows no recommendations.

import { normalizePlace } from "@/lib/destination-match";

export type GuideLocale = "es" | "en";
type Text = Record<GuideLocale, string>;
export const guideCategories = ["imperdibles", "cultura", "playa", "gastronomia", "compras", "familia", "aventura", "vida_nocturna"] as const;
export type GuideCategory = (typeof guideCategories)[number];

export type Highlight = {
  id: string; name: Text; categories: GuideCategory[]; image: string; alt: Text; description: Text;
  link?: string; family?: boolean;
};
export type GuideFact = { key: "airport" | "currency" | "language" | "power" | "tips" | "transport"; value: Text };
export type DestinationGuide = {
  slug: string; names: string[]; name: Text; hero: { image: string; alt: Text } | null; intro: Text;
  facts: GuideFact[]; highlights: Highlight[]; tourism?: { url: string; label: string };
};

const usPower: GuideFact = { key: "power", value: { es: "120 V, enchufes tipo A y B", en: "120 V, type A and B plugs" } };
const usd: GuideFact = { key: "currency", value: { es: "Dólar estadounidense (USD)", en: "US dollar (USD)" } };
const english: GuideFact = { key: "language", value: { es: "Inglés", en: "English" } };
const usTips: GuideFact = { key: "tips", value: { es: "En restaurantes se acostumbra dejar propina; revise si la cuenta ya la incluye.", en: "Tipping is customary in restaurants; check whether the bill already includes it." } };

export const destinationGuides: DestinationGuide[] = [
  {
    slug: "miami", names: ["miami", "miami beach"], name: { es: "Miami", en: "Miami" },
    hero: { image: "/destinos/miami.jpg", alt: { es: "Rascacielos de Miami frente a la bahía de Biscayne", en: "Miami skyline across Biscayne Bay" } },
    intro: {
      es: "Playa, barrios con carácter propio y compras para todos los presupuestos. En Miami el español se escucha en cada esquina, y la ciudad se disfruta mejor por zonas: la playa, el centro y los barrios del oeste.",
      en: "Beaches, neighbourhoods with their own character and shopping for every budget. Spanish is heard on every corner, and the city is best enjoyed area by area: the beach, downtown and the western neighbourhoods.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional de Miami (MIA)", en: "Miami International Airport (MIA)" } },
      usd, { key: "language", value: { es: "Inglés; el español es de uso común", en: "English; Spanish is widely spoken" } }, usPower, usTips,
    ],
    tourism: { url: "https://www.miamiandbeaches.com/", label: "miamiandbeaches.com" },
    highlights: [
      { id: "south-beach", name: { es: "South Beach y Ocean Drive", en: "South Beach and Ocean Drive" }, categories: ["imperdibles", "playa"], image: "/destinos/que-hacer/miami/south-beach.jpg",
        alt: { es: "Hoteles art déco y palmeras en Ocean Drive, South Beach", en: "Art deco hotels and palm trees on Ocean Drive, South Beach" },
        description: { es: "Hoteles art déco de los años treinta, palmeras y una playa amplia a una cuadra. Se disfruta caminando, temprano por la mañana o al atardecer.", en: "1930s art deco hotels, palm trees and a wide beach one block away. Best enjoyed on foot, early in the morning or at sunset." },
        link: "https://www.miamiandbeaches.com/neighborhoods/south-beach" },
      { id: "little-havana", name: { es: "La Pequeña Habana y la Calle Ocho", en: "Little Havana and Calle Ocho" }, categories: ["gastronomia", "cultura"], image: "/destinos/que-hacer/miami/little-havana.jpg",
        alt: { es: "Parque del Dominó en la Calle Ocho de la Pequeña Habana", en: "Domino Park on Calle Ocho in Little Havana" },
        description: { es: "El corazón cubano de Miami: café de ventanita, el Parque del Dominó y restaurantes familiares a lo largo de la Calle Ocho.", en: "Miami's Cuban heart: coffee from a walk-up window, Domino Park and family restaurants along Calle Ocho." },
        link: "https://www.miamiandbeaches.com/neighborhoods/little-havana", family: true },
      { id: "vizcaya", name: { es: "Museo y Jardines Vizcaya", en: "Vizcaya Museum and Gardens" }, categories: ["cultura"], image: "/destinos/que-hacer/miami/vizcaya.jpg",
        alt: { es: "Villa y jardines del Museo Vizcaya en Miami", en: "Villa and gardens of Vizcaya Museum in Miami" },
        description: { es: "Una villa de principios del siglo XX frente a la bahía de Biscayne, con salones de época y jardines formales. Un recorrido tranquilo, lejos del movimiento de la playa.", en: "An early 20th-century villa on Biscayne Bay, with period rooms and formal gardens. A calm visit, away from the bustle of the beach." },
        link: "https://vizcaya.org/" },
      { id: "everglades", name: { es: "Parque Nacional Everglades", en: "Everglades National Park" }, categories: ["aventura", "familia"], image: "/destinos/que-hacer/miami/everglades.jpg",
        alt: { es: "Caimán americano en el sendero Anhinga del Parque Nacional Everglades", en: "American alligator on the Anhinga Trail, Everglades National Park" },
        description: { es: "Humedales, aves y caimanes en su hábitat, a las afueras de la ciudad. El sendero Anhinga es corto y plano, apto para toda la familia.", en: "Wetlands, birds and alligators in the wild, on the edge of the city. The Anhinga Trail is short and flat, easy for the whole family." },
        link: "https://www.nps.gov/ever/", family: true },
      { id: "bayside", name: { es: "Bayside Marketplace", en: "Bayside Marketplace" }, categories: ["compras", "familia"], image: "/destinos/que-hacer/miami/bayside.jpg",
        alt: { es: "Letras de Bayside entre palmeras, frente a la bahía de Miami", en: "Bayside letters among palm trees by Biscayne Bay" },
        description: { es: "Tiendas, restaurantes y música al aire libre junto a la bahía, en el centro de Miami. Desde su muelle salen paseos en barco por la bahía.", en: "Open-air shops, restaurants and music by the bay in downtown Miami. Boat tours of the bay leave from its marina." },
        link: "https://www.baysidemarketplace.com/", family: true },
      { id: "dolphin-mall", name: { es: "Dolphin Mall", en: "Dolphin Mall" }, categories: ["compras"], image: "/destinos/que-hacer/miami/dolphin-mall.jpg",
        alt: { es: "Entrada principal del centro comercial Dolphin Mall", en: "Main entrance of Dolphin Mall" },
        description: { es: "Tiendas outlet y de marca bajo un mismo techo, al oeste de la ciudad. Una parada habitual para quienes viajan de compras.", en: "Outlet and brand stores under one roof, west of the city. A regular stop for shopping trips." } },
      { id: "brickell", name: { es: "Brickell", en: "Brickell" }, categories: ["vida_nocturna", "gastronomia"], image: "/destinos/que-hacer/miami/brickell.jpg",
        alt: { es: "Torres de Brickell iluminadas junto al río Miami de noche", en: "Brickell towers lit up by the Miami River at night" },
        description: { es: "El distrito financiero cambia de ritmo al caer la tarde: restaurantes, terrazas y el paseo junto al río Miami.", en: "The financial district changes pace in the evening: restaurants, terraces and the Miami River walk." } },
    ],
  },
  {
    slug: "nueva-york", names: ["nueva york", "new york", "nueva york ny", "manhattan"], name: { es: "Nueva York", en: "New York" },
    hero: { image: "/destinos/nueva-york.jpg", alt: { es: "Rascacielos del bajo Manhattan vistos desde el agua", en: "Lower Manhattan skyline seen from the water" } },
    intro: {
      es: "Rascacielos, parques, museos y teatro en una ciudad que se recorre a pie y en metro. Manhattan concentra la mayoría de los íconos; conviene planificar cada día por zonas.",
      en: "Skyscrapers, parks, museums and theatre in a city best explored on foot and by subway. Manhattan holds most of the icons; plan each day by area.",
    },
    facts: [
      { key: "airport", value: { es: "JFK, LaGuardia (LGA) y Newark (EWR, en Nueva Jersey)", en: "JFK, LaGuardia (LGA) and Newark (EWR, in New Jersey)" } },
      usd, english, usPower, { key: "transport", value: { es: "El metro funciona las 24 horas", en: "The subway runs 24 hours a day" } }, usTips,
    ],
    tourism: { url: "https://www.nyctourism.com/", label: "nyctourism.com" },
    highlights: [
      { id: "central-park", name: { es: "Central Park", en: "Central Park" }, categories: ["imperdibles", "familia"], image: "/destinos/que-hacer/nueva-york/central-park.jpg",
        alt: { es: "Puente Bow sobre el lago de Central Park", en: "Bow Bridge over the Lake in Central Park" },
        description: { es: "Más de 300 hectáreas de prados, lagos y senderos en medio de Manhattan. El puente Bow, sobre el lago, es uno de sus rincones más conocidos.", en: "Over 800 acres of lawns, lakes and paths in the middle of Manhattan. Bow Bridge, over the Lake, is one of its best-known spots." },
        link: "https://www.centralparknyc.org/", family: true },
      { id: "estatua-libertad", name: { es: "Estatua de la Libertad", en: "Statue of Liberty" }, categories: ["imperdibles", "cultura"], image: "/destinos/que-hacer/nueva-york/estatua-libertad.jpg",
        alt: { es: "Estatua de la Libertad con un barco turístico en la bahía", en: "Statue of Liberty with a sightseeing boat in the harbour" },
        description: { es: "Se visita en ferry desde Battery Park; el mismo recorrido llega a la isla Ellis y su museo de la inmigración.", en: "Reached by ferry from Battery Park; the same trip stops at Ellis Island and its immigration museum." },
        link: "https://www.nps.gov/stli/", family: true },
      { id: "puente-brooklyn", name: { es: "Puente de Brooklyn", en: "Brooklyn Bridge" }, categories: ["imperdibles"], image: "/destinos/que-hacer/nueva-york/puente-brooklyn.jpg",
        alt: { es: "Paseo peatonal del puente de Brooklyn con Manhattan al fondo", en: "Brooklyn Bridge walkway with Manhattan behind" },
        description: { es: "Crúcelo a pie por su paseo peatonal elevado, con vistas al bajo Manhattan. Del lado de Brooklyn, el parque junto al río tiene una de las mejores vistas de la ciudad.", en: "Walk across on its raised promenade, with views of Lower Manhattan. On the Brooklyn side, the riverside park has one of the best views of the city." } },
      { id: "times-square", name: { es: "Times Square y Broadway", en: "Times Square and Broadway" }, categories: ["vida_nocturna", "compras"], image: "/destinos/que-hacer/nueva-york/times-square.jpg",
        alt: { es: "Pantallas iluminadas de Times Square de noche", en: "Times Square screens lit up at night" },
        description: { es: "Pantallas, tiendas y los teatros de Broadway a pocas cuadras. Para ver un musical, conviene comprar las entradas con anticipación.", en: "Screens, shops and the Broadway theatres a few blocks away. To see a musical, book tickets in advance." },
        link: "https://www.timessquarenyc.org/" },
    ],
  },
  {
    slug: "orlando", names: ["orlando", "kissimmee"], name: { es: "Orlando", en: "Orlando" },
    hero: { image: "/destinos/orlando.jpg", alt: { es: "Lago Eola y edificios del centro de Orlando al atardecer", en: "Lake Eola and downtown Orlando at sunset" } },
    intro: {
      es: "La capital de los parques temáticos, con mucho más alrededor: compras, entretenimiento y la costa espacial de Florida a una excursión de distancia.",
      en: "The theme-park capital, with much more around it: shopping, entertainment and Florida's Space Coast within a day trip.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional de Orlando (MCO)", en: "Orlando International Airport (MCO)" } },
      usd, english, usPower, { key: "transport", value: { es: "Las distancias entre parques y zonas de compras son largas; muchos visitantes se mueven en auto.", en: "Distances between parks and shopping areas are long; many visitors get around by car." } },
    ],
    tourism: { url: "https://www.visitorlando.com/", label: "visitorlando.com" },
    highlights: [
      { id: "parques-tematicos", name: { es: "Walt Disney World y Universal Orlando", en: "Walt Disney World and Universal Orlando" }, categories: ["imperdibles", "familia"], image: "/destinos/que-hacer/orlando/parques-tematicos.jpg",
        alt: { es: "Calle principal de un parque temático de Orlando", en: "Main street of an Orlando theme park" },
        description: { es: "Los dos grandes complejos de parques de Orlando. Reserve al menos un día por parque y revise en el sitio oficial de cada uno los horarios de su fecha.", en: "Orlando's two big theme-park resorts. Allow at least one day per park and check each official website for opening hours on your dates." },
        link: "https://www.visitorlando.com/", family: true },
      { id: "kennedy-space-center", name: { es: "Kennedy Space Center", en: "Kennedy Space Center" }, categories: ["familia", "cultura"], image: "/destinos/que-hacer/orlando/kennedy-space-center.jpg",
        alt: { es: "Jardín de cohetes del Kennedy Space Center", en: "Rocket Garden at Kennedy Space Center" },
        description: { es: "El complejo de visitantes de la NASA en Cabo Cañaveral: cohetes reales, el transbordador Atlantis y exhibiciones para todas las edades. Es una excursión de un día desde Orlando.", en: "NASA's visitor complex at Cape Canaveral: real rockets, the space shuttle Atlantis and exhibits for all ages. A day trip from Orlando." },
        link: "https://www.kennedyspacecenter.com/", family: true },
      { id: "disney-springs", name: { es: "Disney Springs", en: "Disney Springs" }, categories: ["compras", "gastronomia"], image: "/destinos/que-hacer/orlando/disney-springs.jpg",
        alt: { es: "Tiendas y restaurantes junto al agua en Disney Springs", en: "Shops and restaurants by the water at Disney Springs" },
        description: { es: "Tiendas, restaurantes y entretenimiento junto al lago, con entrada libre. Un buen plan para la tarde después de un día de parque.", en: "Lakeside shops, restaurants and entertainment with free entry. A good evening plan after a park day." },
        link: "https://www.disneysprings.com/", family: true },
      { id: "citywalk", name: { es: "Universal CityWalk", en: "Universal CityWalk" }, categories: ["vida_nocturna", "gastronomia"], image: "/destinos/que-hacer/orlando/citywalk.jpg",
        alt: { es: "Canal y restaurantes de Universal CityWalk", en: "Canal and restaurants at Universal CityWalk" },
        description: { es: "Restaurantes, música en vivo y cine a la salida de los parques de Universal, abierto hasta tarde.", en: "Restaurants, live music and a cinema at the gates of Universal's parks, open late." },
        link: "https://www.universalorlando.com/" },
    ],
  },
  {
    slug: "houston", names: ["houston"], name: { es: "Houston", en: "Houston" },
    hero: { image: "/destinos/houston.jpg", alt: { es: "Rascacielos del centro de Houston sobre el Buffalo Bayou", en: "Downtown Houston skyline over Buffalo Bayou" } },
    intro: {
      es: "Una ciudad amplia y diversa, conocida por su gastronomía, su Distrito de Museos y el centro espacial de la NASA.",
      en: "A large, diverse city known for its food, its Museum District and NASA's space center.",
    },
    facts: [
      { key: "airport", value: { es: "George Bush Intercontinental (IAH) y William P. Hobby (HOU)", en: "George Bush Intercontinental (IAH) and William P. Hobby (HOU)" } },
      usd, english, usPower, { key: "transport", value: { es: "La ciudad es extensa; el auto facilita moverse entre zonas.", en: "The city is spread out; a car makes it easier to get around." } },
    ],
    tourism: { url: "https://www.visithoustontexas.com/", label: "visithoustontexas.com" },
    highlights: [
      { id: "space-center", name: { es: "Space Center Houston", en: "Space Center Houston" }, categories: ["imperdibles", "familia"], image: "/destinos/que-hacer/houston/space-center.jpg",
        alt: { es: "Edificio de Space Center Houston", en: "Space Center Houston building" },
        description: { es: "El centro de visitantes del Centro Espacial Johnson de la NASA, con naves reales, exhibiciones y recorridos por las instalaciones.", en: "The visitor center of NASA's Johnson Space Center, with real spacecraft, exhibits and tours of the site." },
        link: "https://spacecenter.org/", family: true },
      { id: "museo-bellas-artes", name: { es: "Museo de Bellas Artes de Houston", en: "Museum of Fine Arts, Houston" }, categories: ["cultura"], image: "/destinos/que-hacer/houston/museo-bellas-artes.jpg",
        alt: { es: "Museo de Bellas Artes de Houston entre robles", en: "Museum of Fine Arts, Houston among oak trees" },
        description: { es: "Uno de los museos de arte más grandes del país, en el Distrito de Museos, rodeado de parques y otros museos.", en: "One of the largest art museums in the country, in the Museum District, surrounded by parks and other museums." },
        link: "https://www.mfah.org/" },
    ],
  },
  {
    slug: "cancun", names: ["cancun", "riviera maya", "playa del carmen"], name: { es: "Cancún", en: "Cancún" }, hero: null,
    intro: {
      es: "Playas del Caribe mexicano y, a pocas horas, zonas arqueológicas mayas, cenotes e islas. Buena parte de las excursiones salen de los mismos hoteles.",
      en: "Mexican Caribbean beaches and, a few hours away, Mayan sites, cenotes and islands. Many tours pick up at the hotels.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional de Cancún (CUN)", en: "Cancún International Airport (CUN)" } },
      { key: "currency", value: { es: "Peso mexicano (MXN)", en: "Mexican peso (MXN)" } },
      { key: "language", value: { es: "Español", en: "Spanish" } },
      { key: "power", value: { es: "127 V, enchufes tipo A y B", en: "127 V, type A and B plugs" } },
    ],
    highlights: [
      { id: "chichen-itza", name: { es: "Chichén Itzá", en: "Chichén Itzá" }, categories: ["imperdibles", "cultura"], image: "/destinos/que-hacer/cancun/chichen-itza.jpg",
        alt: { es: "Pirámide de El Castillo en Chichén Itzá", en: "El Castillo pyramid at Chichén Itzá" },
        description: { es: "La gran ciudad maya de Yucatán, con la pirámide de El Castillo. Es una excursión de día completo desde Cancún; muchos recorridos incluyen un cenote.", en: "The great Mayan city of Yucatán, with the El Castillo pyramid. A full-day trip from Cancún; many tours include a cenote." }, family: true },
      { id: "isla-mujeres", name: { es: "Isla Mujeres", en: "Isla Mujeres" }, categories: ["playa"], image: "/destinos/que-hacer/cancun/isla-mujeres.jpg",
        alt: { es: "Agua turquesa de Playa Norte en Isla Mujeres", en: "Turquoise water at Playa Norte, Isla Mujeres" },
        description: { es: "Se llega en ferry desde Cancún. Playa Norte tiene agua tranquila y poco profunda, ideal para un día de playa.", en: "Reached by ferry from Cancún. Playa Norte has calm, shallow water, ideal for a beach day." }, family: true },
      { id: "tulum", name: { es: "Zona arqueológica de Tulum", en: "Tulum archaeological site" }, categories: ["cultura", "playa"], image: "/destinos/que-hacer/cancun/tulum.jpg",
        alt: { es: "Zona arqueológica de Tulum sobre el mar Caribe", en: "Tulum ruins above the Caribbean Sea" },
        description: { es: "Ruinas mayas sobre un acantilado frente al mar Caribe, al sur de la Riviera Maya.", en: "Mayan ruins on a cliff above the Caribbean Sea, south along the Riviera Maya." } },
      { id: "cenotes", name: { es: "Cenotes", en: "Cenotes" }, categories: ["aventura"], image: "/destinos/que-hacer/cancun/cenote.jpg",
        alt: { es: "Cenote Ik Kil con raíces colgantes sobre el agua", en: "Ik Kil cenote with hanging roots over the water" },
        description: { es: "Pozos naturales de agua dulce, típicos de la península de Yucatán. Ik Kil, cerca de Chichén Itzá, es uno de los más visitados.", en: "Natural freshwater sinkholes typical of the Yucatán Peninsula. Ik Kil, near Chichén Itzá, is one of the most visited." } },
    ],
  },
  {
    slug: "punta-cana", names: ["punta cana", "bavaro"], name: { es: "Punta Cana", en: "Punta Cana" }, hero: null,
    intro: {
      es: "Playas de arena blanca, resorts y excursiones a islas y pueblos coloniales. Casi todo se organiza desde el hotel.",
      en: "White-sand beaches, resorts and trips to islands and colonial towns. Almost everything is arranged from the hotel.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional de Punta Cana (PUJ)", en: "Punta Cana International Airport (PUJ)" } },
      { key: "currency", value: { es: "Peso dominicano (DOP); el dólar es de uso común en hoteles", en: "Dominican peso (DOP); US dollars are widely used at hotels" } },
      { key: "language", value: { es: "Español", en: "Spanish" } },
      { key: "power", value: { es: "110 V, enchufes tipo A y B", en: "110 V, type A and B plugs" } },
    ],
    highlights: [
      { id: "playas", name: { es: "Playas de Bávaro y Punta Cana", en: "Bávaro and Punta Cana beaches" }, categories: ["imperdibles", "playa"], image: "/destinos/que-hacer/punta-cana/playas.jpg",
        alt: { es: "Costa de Punta Cana con arena blanca y palmeras", en: "Punta Cana coastline with white sand and palm trees" },
        description: { es: "Kilómetros de arena blanca con palmeras. La mayoría de los hoteles está frente al mar, con playa a pocos pasos.", en: "Miles of white sand and palm trees. Most hotels are on the seafront, a few steps from the beach." }, family: true },
      { id: "isla-saona", name: { es: "Isla Saona", en: "Saona Island" }, categories: ["playa", "aventura"], image: "/destinos/que-hacer/punta-cana/isla-saona.jpg",
        alt: { es: "Playa de arena blanca y palmeras en Isla Saona", en: "White-sand beach and palm trees on Saona Island" },
        description: { es: "Parte del Parque Nacional del Este. Las excursiones de día completo combinan lancha, catamarán y playa.", en: "Part of Parque Nacional del Este. Full-day trips combine speedboat, catamaran and beach time." }, family: true },
      { id: "altos-de-chavon", name: { es: "Altos de Chavón", en: "Altos de Chavón" }, categories: ["cultura"], image: "/destinos/que-hacer/punta-cana/altos-de-chavon.jpg",
        alt: { es: "Altos de Chavón sobre el río Chavón", en: "Altos de Chavón above the Chavón River" },
        description: { es: "Una villa de estilo mediterráneo sobre el río Chavón, en La Romana, con anfiteatro, galerías y vistas al río.", en: "A Mediterranean-style village above the Chavón River in La Romana, with an amphitheatre, galleries and river views." } },
      { id: "zona-colonial", name: { es: "Zona Colonial de Santo Domingo", en: "Colonial Zone of Santo Domingo" }, categories: ["cultura"], image: "/destinos/que-hacer/punta-cana/zona-colonial.jpg",
        alt: { es: "Fachada de la Catedral Primada de América en Santo Domingo", en: "Facade of the Cathedral of Santa María la Menor in Santo Domingo" },
        description: { es: "El centro histórico de Santo Domingo, con la Catedral Primada de América. Es una excursión de día completo desde Punta Cana.", en: "Santo Domingo's historic centre, with the first cathedral in the Americas. A full-day trip from Punta Cana." } },
    ],
  },
  {
    slug: "cartagena", names: ["cartagena", "cartagena de indias"], name: { es: "Cartagena", en: "Cartagena" }, hero: null,
    intro: {
      es: "Una ciudad amurallada del Caribe que se recorre a pie, con playas e islas a un paseo en lancha.",
      en: "A walled Caribbean city best explored on foot, with beaches and islands a boat ride away.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional Rafael Núñez (CTG)", en: "Rafael Núñez International Airport (CTG)" } },
      { key: "currency", value: { es: "Peso colombiano (COP)", en: "Colombian peso (COP)" } },
      { key: "language", value: { es: "Español", en: "Spanish" } },
      { key: "power", value: { es: "110 V, enchufes tipo A y B", en: "110 V, type A and B plugs" } },
    ],
    highlights: [
      { id: "ciudad-amurallada", name: { es: "Ciudad amurallada", en: "The walled city" }, categories: ["imperdibles", "cultura"], image: "/destinos/que-hacer/cartagena/ciudad-amurallada.jpg",
        alt: { es: "Puerta del Reloj, entrada a la ciudad amurallada de Cartagena", en: "Clock Tower Gate, entrance to Cartagena's walled city" },
        description: { es: "Calles coloniales, balcones con flores y plazas que se recorren a pie. La Torre del Reloj es su entrada principal.", en: "Colonial streets, flower-filled balconies and squares to explore on foot. The Clock Tower is the main gate." }, family: true },
      { id: "getsemani", name: { es: "Getsemaní", en: "Getsemaní" }, categories: ["gastronomia", "vida_nocturna"], image: "/destinos/que-hacer/cartagena/getsemani.jpg",
        alt: { es: "Casas coloridas con balcones en Getsemaní", en: "Colourful houses with balconies in Getsemaní" },
        description: { es: "El barrio vecino a la ciudad amurallada: murales, plazas con ambiente de noche y restaurantes locales.", en: "The neighbourhood next to the walled city: murals, lively squares at night and local restaurants." } },
      { id: "san-felipe", name: { es: "Castillo San Felipe de Barajas", en: "San Felipe de Barajas Castle" }, categories: ["cultura"], image: "/destinos/que-hacer/cartagena/san-felipe.jpg",
        alt: { es: "Murallas del Castillo San Felipe de Barajas", en: "Walls of San Felipe de Barajas Castle" },
        description: { es: "Una de las mayores fortalezas españolas en América, con túneles y vistas a la ciudad. Por el calor, conviene visitarla temprano.", en: "One of the largest Spanish fortresses in the Americas, with tunnels and city views. Because of the heat, go early." }, family: true },
    ],
  },
  {
    slug: "panama", names: ["panama", "ciudad de panama", "panama city"], name: { es: "Panamá", en: "Panama" }, hero: null,
    intro: {
      es: "El Canal, un casco histórico frente a la bahía, compras y, a pocas horas, islas y montañas. La Ciudad de Panamá es una buena base para todo.",
      en: "The Canal, a historic quarter on the bay, shopping and, a few hours away, islands and mountains. Panama City is a good base for all of it.",
    },
    facts: [
      { key: "airport", value: { es: "Aeropuerto Internacional de Tocumen (PTY)", en: "Tocumen International Airport (PTY)" } },
      { key: "currency", value: { es: "Balboa y dólar estadounidense, a la par", en: "Balboa and US dollar, at par" } },
      { key: "language", value: { es: "Español", en: "Spanish" } },
      { key: "power", value: { es: "110 V, enchufes tipo A y B", en: "110 V, type A and B plugs" } },
    ],
    highlights: [
      { id: "canal-miraflores", name: { es: "Esclusas de Miraflores", en: "Miraflores Locks" }, categories: ["imperdibles", "familia"], image: "/experiencias/canal-miraflores.jpg",
        alt: { es: "Vista de las esclusas de Miraflores desde el Centro de Visitantes", en: "Miraflores Locks seen from the Visitor Center" },
        description: { es: "Desde el centro de visitantes se ve el paso de los barcos por el Canal de Panamá, con museo y miradores.", en: "From the visitor center you can watch ships transit the Panama Canal, with a museum and viewing decks." }, family: true },
      { id: "casco-antiguo", name: { es: "Casco Antiguo", en: "Casco Antiguo" }, categories: ["cultura", "gastronomia"], image: "/experiencias/casco-antiguo.jpg",
        alt: { es: "Plaza arbolada y edificios históricos del Casco Antiguo", en: "Tree-lined square and historic buildings in Casco Antiguo" },
        description: { es: "El barrio histórico, Patrimonio de la Humanidad: plazas, iglesias y restaurantes con vista a la bahía.", en: "The historic quarter, a World Heritage Site: squares, churches and restaurants with bay views." } },
      { id: "biomuseo", name: { es: "Biomuseo", en: "Biomuseo" }, categories: ["familia", "cultura"], image: "/experiencias/biomuseo.jpg",
        alt: { es: "Edificio de colores del Biomuseo, en la Calzada de Amador", en: "The colourful Biomuseo building on the Amador Causeway" },
        description: { es: "Museo de la biodiversidad diseñado por Frank Gehry, en la Calzada de Amador.", en: "A biodiversity museum designed by Frank Gehry, on the Amador Causeway." }, family: true },
      { id: "panama-viejo", name: { es: "Panamá Viejo", en: "Panamá Viejo" }, categories: ["cultura"], image: "/experiencias/panama-viejo.jpg",
        alt: { es: "Torre de la catedral y ruinas del sitio arqueológico de Panamá Viejo", en: "Cathedral tower and ruins at Panamá Viejo" },
        description: { es: "Ruinas de la primera ciudad española en la costa del Pacífico, con la torre de su catedral.", en: "Ruins of the first Spanish city on the Pacific coast, with its cathedral tower." } },
      { id: "san-blas", name: { es: "San Blas (Guna Yala)", en: "San Blas (Guna Yala)" }, categories: ["playa", "aventura"], image: "/experiencias/san-blas.jpg",
        alt: { es: "Isla con palmeras y cabañas en el archipiélago de San Blas", en: "Island with palm trees and huts in the San Blas archipelago" },
        description: { es: "Islas de arena blanca en territorio guna. Se visitan en excursión desde la ciudad.", en: "White-sand islands in Guna territory, visited on a trip from the city." } },
    ],
  },
];

// The guide for a reservation's destination ("Miami", "Cancún, México", "Nueva York y Toronto"): whole
// words only, longest name first, same rule as the published destination match.
export function guideFor(destino: string | null | undefined): DestinationGuide | null {
  const place = `-${normalizePlace(destino ?? "")}-`;
  if (place === "--") return null;
  const candidates = destinationGuides.flatMap(guide => guide.names.map(name => ({ guide, name: normalizePlace(name) }))).sort((a, b) => b.name.length - a.name.length);
  return candidates.find(candidate => place.includes(`-${candidate.name}-`))?.guide ?? null;
}

export type GuideView = {
  slug: string; name: string; intro: string; hero: { image: string; alt: string } | null;
  facts: { key: GuideFact["key"]; value: string }[];
  highlights: { id: string; name: string; categories: GuideCategory[]; image: string; alt: string; description: string; link: string | null }[];
  tourism: { url: string; label: string } | null;
};

// One language, in editorial order. A family trip (children or infants on the reservation) sees the
// family-friendly entries first; nothing is hidden, so the list never looks thinner for them.
export function guideView(guide: DestinationGuide, locale: string, options: { family?: boolean; limit?: number } = {}): GuideView {
  const lang: GuideLocale = locale === "en" ? "en" : "es";
  const ordered = options.family ? [...guide.highlights.filter(item => item.family), ...guide.highlights.filter(item => !item.family)] : guide.highlights;
  return {
    slug: guide.slug, name: guide.name[lang], intro: guide.intro[lang],
    hero: guide.hero ? { image: guide.hero.image, alt: guide.hero.alt[lang] } : null,
    facts: guide.facts.map(fact => ({ key: fact.key, value: fact.value[lang] })),
    highlights: ordered.slice(0, options.limit ?? 8).map(item => ({ id: item.id, name: item.name[lang], categories: item.categories, image: item.image, alt: item.alt[lang], description: item.description[lang], link: item.link ?? null })),
    tourism: guide.tourism ?? null,
  };
}
