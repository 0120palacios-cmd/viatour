import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { Hero, HowItWorks, FeaturedDestinations, DiscoverTeaser, FeaturedPackages, Services, WhyViatour, SocialReels, ReviewsTeaser, TravelGuides, FrequentlyAskedQuestions, TravelRequirements, FinalCta } from "@/components/home/sections";
import { Newsletter } from "@/components/layout/newsletter";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/", "home"); }
export default function Home() { return <main><Hero /><HowItWorks /><FeaturedDestinations /><DiscoverTeaser /><FeaturedPackages /><Services /><WhyViatour /><SocialReels /><ReviewsTeaser /><TravelGuides /><FrequentlyAskedQuestions /><TravelRequirements /><FinalCta /><Newsletter /></main>; }
