import { notFound } from "next/navigation";
import { featuredDestinations } from "@/lib/destinations";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: featuredDestinations.find(destination => destination.slug === slug)?.name ?? "Destinos" };
}

export default async function DestinationStub({ params }: Props) {
  const { slug } = await params;
  const destination = featuredDestinations.find(destination => destination.slug === slug);
  if (!destination) notFound();
  // El contenido real del destino se incorpora en la Etapa 5.
  return <main className="container-site py-14 sm:py-24"><h1 className="t-h1">{destination.name}</h1></main>;
}
