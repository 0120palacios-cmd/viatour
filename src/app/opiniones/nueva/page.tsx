import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localizedPageMetadata } from "@/lib/seo";
import { getDestinations } from "@/lib/destinations";
import { getValidReviewInvitation } from "@/lib/review-invitations";
import { ReviewForm } from "@/components/reviews/form";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/opiniones/nueva", "newReview"); }
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const t = await getTranslations("reviews"); const token = String((await searchParams).token ?? "").trim(); const invitation = token ? await getValidReviewInvitation(token) : null; let destinations: string[] = []; let failed = false; try { destinations = [...new Set((await getDestinations()).map(item => item.nombre))]; } catch { failed = true; } return <main className="container-site py-14 sm:py-24"><div className="max-w-2xl space-y-8"><h1 className="t-h1">{t("formTitle")}</h1>{invitation && <p className="t-body rounded-card border border-line bg-surface p-6">{t("invitation")}</p>}{token && !invitation && <p role="alert" className="t-body text-error">{t("invalidInvitation")}</p>}{failed && <p role="status" className="t-body text-ink-soft">{t("destinationLoadError")}</p>}<ReviewForm destinations={destinations} invitation={invitation ? { token: invitation.token, nombre: invitation.nombre, email: invitation.email } : undefined} /></div></main>; }
