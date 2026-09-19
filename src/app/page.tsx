import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/", "viatour | Asesoría para planificar su viaje desde Honduras", "Asesoría para planificar su viaje desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje.");
import { Hero, FeaturedDestinations, FeaturedPackages, WhyViatour, ReviewsTeaser, FinalCta } from "@/components/home/sections";
import { Newsletter } from "@/components/layout/newsletter";

export default function Home() {
  return <main><Hero /><FeaturedDestinations /><FeaturedPackages /><WhyViatour /><ReviewsTeaser /><FinalCta /><Newsletter /></main>;
}
