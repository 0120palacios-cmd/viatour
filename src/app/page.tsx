import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { Hero, HowItWorks, FeaturedDestinations, FeaturedPackages, SocialReels, ReviewsTeaser, TravelGuides, FrequentlyAskedQuestions } from "@/components/home/sections";
import { HomeClosing, SharePromo, TripStyles } from "@/components/home/journeys";
import { Newsletter } from "@/components/layout/newsletter";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/", "home"); }
// Order follows the decision journey: ask for a quote or start exploring (trip style, destinations),
// then proof from real travellers before the catalogue, how it works and what is confirmed before paying,
// help to decide (guides, questions), the travellers' promotion, and a close that separates new trips
// from existing bookings.
export default function Home() { return <main><Hero /><TripStyles /><FeaturedDestinations /><ReviewsTeaser /><FeaturedPackages /><HowItWorks /><TravelGuides /><FrequentlyAskedQuestions /><SharePromo /><SocialReels /><HomeClosing /><Newsletter /></main>; }
