import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { Hero, HowItWorks, FeaturedDestinations, FeaturedPackages, Services, WhyViatour, SocialReels, ReviewsTeaser, TravelGuides, FrequentlyAskedQuestions } from "@/components/home/sections";
import { HomeClosing, SharePromo, TripStyles } from "@/components/home/journeys";
import { Newsletter } from "@/components/layout/newsletter";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/", "home"); }
// Order follows the decision journey: ask for a quote or start exploring (trip style, destinations, packages),
// then how it works and who vouches for it, the travellers' promotion, the rest of the offer and help,
// and a close that separates new trips from existing bookings.
export default function Home() { return <main><Hero /><TripStyles /><FeaturedDestinations /><FeaturedPackages /><HowItWorks /><ReviewsTeaser /><SharePromo /><Services /><WhyViatour /><TravelGuides /><FrequentlyAskedQuestions /><SocialReels /><HomeClosing /><Newsletter /></main>; }
