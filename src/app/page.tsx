import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { Hero, HowItWorks, FeaturedDestinations, FeaturedPackages, Services, WhyViatour, SocialReels, ReviewsTeaser, TravelGuides, FrequentlyAskedQuestions, FinalCta } from "@/components/home/sections";
import { Newsletter } from "@/components/layout/newsletter";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/", "home"); }
// Order follows the decision journey: what can I do, what can I buy, how it works, who vouches for it, then help and contact.
export default function Home() { return <main><Hero /><FeaturedDestinations /><FeaturedPackages /><HowItWorks /><ReviewsTeaser /><Services /><WhyViatour /><TravelGuides /><FrequentlyAskedQuestions /><SocialReels /><FinalCta /><Newsletter /></main>; }
