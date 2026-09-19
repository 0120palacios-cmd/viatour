export type HomeDestination = {
  slug: string;
  nombre: string;
  image: string;
};

export const homeDestinations: HomeDestination[] = [
  { slug: "punta-cana", nombre: "Punta Cana", image: "/destinos/punta-cana.jpg" },
  { slug: "cartagena", nombre: "Cartagena", image: "/destinos/cartagena.jpg" },
  { slug: "europa", nombre: "Europa", image: "/destinos/europa.jpg" },
  { slug: "argentina", nombre: "Argentina", image: "/destinos/argentina.jpg" },
  { slug: "medio-oriente", nombre: "Medio Oriente", image: "/destinos/medio-oriente.jpg" },
  { slug: "dubai", nombre: "Dubái", image: "/destinos/dubai.jpg" },
  { slug: "cruceros", nombre: "Cruceros", image: "/destinos/cruceros.jpg" },
  { slug: "rio-de-janeiro", nombre: "Río de Janeiro", image: "/destinos/rio-de-janeiro.jpg" },
  { slug: "cancun", nombre: "Cancún", image: "/destinos/cancun.jpg" },
  { slug: "salinitas", nombre: "Salinitas", image: "/destinos/salinitas.jpg" },
  { slug: "panama", nombre: "Panamá", image: "/destinos/panama.jpg" },
];
