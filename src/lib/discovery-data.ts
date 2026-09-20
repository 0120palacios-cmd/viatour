export type DiscoveryTravelerType = "pareja" | "familia" | "amigos" | "solo";
export type DiscoveryExperience = "playa" | "ciudad" | "aventura" | "lujo" | "familiar" | "fiesta" | "romance";
export type DiscoveryBudget = "económico" | "medio" | "alto";
export type DiscoveryClimate = "cálido" | "templado" | "indiferente";
export type DiscoveryDuration = "corta" | "media" | "larga";
export type DiscoveryInterest = "gastronomía" | "cultura" | "naturaleza" | "compras" | "playa" | "vida nocturna" | "familia";

export type DiscoveryAnswers = {
  travelerType: DiscoveryTravelerType;
  experiences: DiscoveryExperience[];
  budget: DiscoveryBudget;
  climate: DiscoveryClimate;
  duration: DiscoveryDuration;
  interests: DiscoveryInterest[];
  travelers: number;
};

export type DiscoveryDestinationProfile = {
  slug: string;
  nombre: string;
  perfil: DiscoveryTravelerType[];
  experiencia: string[];
  presupuesto: string[];
  clima: string[];
  duracion: string[];
};

export type DiscoveryRecommendation = DiscoveryDestinationProfile & {
  score: number;
  why: string;
};

export const discoveryDestinations: DiscoveryDestinationProfile[] = [
  { slug: "punta-cana", nombre: "Punta Cana", perfil: ["pareja", "familia", "amigos"], experiencia: ["playa", "romance", "familiar", "lujo"], presupuesto: ["medio"], clima: ["cálido"], duracion: ["media"] },
  { slug: "cartagena", nombre: "Cartagena", perfil: ["pareja", "amigos"], experiencia: ["playa", "ciudad", "cultura", "romance", "fiesta"], presupuesto: ["económico-medio"], clima: ["cálido"], duracion: ["corta-media"] },
  { slug: "europa", nombre: "Europa", perfil: ["pareja", "solo", "amigos"], experiencia: ["ciudad", "cultura", "romance", "lujo"], presupuesto: ["alto"], clima: ["templado"], duracion: ["larga"] },
  { slug: "argentina", nombre: "Argentina", perfil: ["pareja", "amigos", "solo"], experiencia: ["ciudad", "cultura", "naturaleza", "aventura"], presupuesto: ["medio-alto"], clima: ["templado"], duracion: ["larga"] },
  { slug: "medio-oriente", nombre: "Medio Oriente", perfil: ["pareja", "amigos", "solo"], experiencia: ["cultura", "aventura", "lujo"], presupuesto: ["alto"], clima: ["cálido"], duracion: ["media-larga"] },
  { slug: "dubai", nombre: "Dubái", perfil: ["familia", "pareja", "amigos"], experiencia: ["ciudad", "lujo", "compras", "aventura", "familiar"], presupuesto: ["alto"], clima: ["cálido"], duracion: ["media"] },
  { slug: "cruceros", nombre: "Cruceros", perfil: ["familia", "pareja", "amigos"], experiencia: ["relax", "familiar", "romance"], presupuesto: ["medio-alto"], clima: ["variado"], duracion: ["media"] },
  { slug: "rio-de-janeiro", nombre: "Río de Janeiro", perfil: ["amigos", "pareja"], experiencia: ["playa", "ciudad", "fiesta", "naturaleza"], presupuesto: ["medio"], clima: ["cálido"], duracion: ["corta-media"] },
  { slug: "cancun", nombre: "Cancún", perfil: ["familia", "pareja", "amigos"], experiencia: ["playa", "familiar", "fiesta", "romance"], presupuesto: ["medio"], clima: ["cálido"], duracion: ["corta-media"] },
  { slug: "salinitas", nombre: "Salinitas", perfil: ["familia", "pareja"], experiencia: ["playa", "relax", "familiar"], presupuesto: ["económico"], clima: ["cálido"], duracion: ["corta"] },
  { slug: "panama", nombre: "Panamá", perfil: ["familia", "pareja", "amigos"], experiencia: ["ciudad", "playa", "naturaleza", "compras"], presupuesto: ["medio"], clima: ["cálido"], duracion: ["corta-media"] },
];

const experienceTags: Record<DiscoveryExperience, string[]> = {
  playa: ["playa", "relax"],
  ciudad: ["ciudad"],
  aventura: ["aventura", "naturaleza"],
  lujo: ["lujo"],
  familiar: ["familiar"],
  fiesta: ["fiesta"],
  romance: ["romance"],
};

const interestTags: Record<DiscoveryInterest, string[]> = {
  "gastronomía": ["ciudad", "cultura"],
  cultura: ["cultura"],
  naturaleza: ["naturaleza"],
  compras: ["compras"],
  playa: ["playa"],
  "vida nocturna": ["fiesta"],
  familia: ["familiar"],
};

const travelerLabels: Record<DiscoveryTravelerType, string> = { pareja: "un viaje en pareja", familia: "un viaje familiar", amigos: "un viaje con amigos", solo: "un viaje en solitario" };
const experienceLabels: Record<DiscoveryExperience, string> = { playa: "playa y descanso", ciudad: "ciudad y cultura", aventura: "aventura y naturaleza", lujo: "lujo", familiar: "un plan familiar", fiesta: "vida nocturna", romance: "romance" };

function budgetMatches(answer: DiscoveryBudget, tags: string[]) {
  return tags.some(tag => answer === tag || (answer === "económico" && tag.includes("económico")) || (answer === "medio" && tag.includes("medio")) || (answer === "alto" && tag.includes("alto")));
}

function durationMatches(answer: DiscoveryDuration, tags: string[]) {
  return tags.some(tag => tag === "variado" || tag === answer || (answer === "corta" && tag.includes("corta")) || (answer === "media" && tag.includes("media")) || (answer === "larga" && tag.includes("larga")));
}

function scoreProfile(profile: DiscoveryDestinationProfile, answers: DiscoveryAnswers) {
  let score = 0;
  const reasons: string[] = [];
  if (profile.perfil.includes(answers.travelerType)) { score += 4; reasons.push(travelerLabels[answers.travelerType]); }

  const matchedExperiences = answers.experiences.filter(answer => experienceTags[answer].some(tag => profile.experiencia.includes(tag)));
  if (matchedExperiences.length) {
    score += matchedExperiences.length * 4;
    reasons.push(`responde a ${matchedExperiences.slice(0, 2).map(item => experienceLabels[item]).join(" y ")}`);
  }

  const matchedInterests = answers.interests.filter(answer => interestTags[answer].some(tag => profile.experiencia.includes(tag)));
  if (matchedInterests.length) score += matchedInterests.length * 2;
  if (budgetMatches(answers.budget, profile.presupuesto)) { score += 3; reasons.push(`se ajusta a un presupuesto ${answers.budget}`); }
  if (answers.climate !== "indiferente" && profile.clima.includes(answers.climate)) { score += 2; reasons.push(`coincide con el clima ${answers.climate}`); }
  if (durationMatches(answers.duration, profile.duracion)) { score += 2; reasons.push("encaja con la duración que busca"); }
  if (answers.travelers === 1 && answers.travelerType === "solo" && profile.perfil.includes("solo")) score += 1;
  if (answers.travelers >= 3 && ["familia", "amigos"].includes(answers.travelerType) && profile.perfil.includes(answers.travelerType)) score += 1;

  return { score, reasons };
}

export function scoreDestinations(answers: DiscoveryAnswers, profiles: DiscoveryDestinationProfile[] = discoveryDestinations): DiscoveryRecommendation[] {
  const ranked = profiles.map((profile, index) => {
    const result = scoreProfile(profile, answers);
    const reason = result.reasons.length ? result.reasons.slice(0, 3).join("; ") : "ofrece una combinación que puede explorar con asesoría";
    return { recommendation: { ...profile, score: result.score, why: `Lo recomendamos porque ${reason}.` }, index };
  });
  ranked.sort((a, b) => b.recommendation.score - a.recommendation.score || a.index - b.index);
  return ranked.slice(0, 3).map(item => item.recommendation);
}

export function discoveryImage(slug: string) {
  return `/destinos/${slug}.jpg`;
}
