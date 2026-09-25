export const siteConfig = {
  name: "viatour",
  domain: "miviatour.com",
  url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://miviatour.com").replace(/\/$/, ""),
  tagline: "sueña, descubre, sonríe.",
  whatsappNumber: "50488668704", // +504 8866-8704, wa.me link format
  supportEmail: "soporte@miviatour.com",
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJA3jvVBVm3EsRqoKUq4JyyFQ",
  googleProfileUrl: "https://www.google.com/maps/place/Viatour+Travel/@15.22431,-86.2092911,7z/data=!3m1!4b1!4m6!3m5!1s0x4adc661554ef7803:0x54c87282ab9482aa!8m2!3d15.22431!4d-86.2092912!16s%2Fg%2F11zxtz5dxl",
  reviewInvitationFrom: "no-reply@miviatour.com",
  portalOtpFrom: "no-reply@miviatour.com",
  helpEmail: "ayuda@miviatour.com",
  defaultCurrency: "USD" as const,
  social: {
    facebook: "https://www.facebook.com/viatourTrips",
    instagram: "https://www.instagram.com/viatour.inc/",
    tiktok: "https://www.tiktok.com/@miviatour",
  },
  socialVideos: [] as { platform: "tiktok" | "instagram" | "youtube"; url: string }[],
  // Add approved, public post URLs here before publishing social embeds.
  socialReels: {
    instagram: [] as string[],
    tiktok: [] as string[],
  },
} as const;
