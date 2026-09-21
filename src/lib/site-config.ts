export const siteConfig = {
  name: "viatour",
  domain: "miviatour.com",
  url: "https://miviatour.com",
  tagline: "sueña, descubre, sonríe.",
  whatsappNumber: "50488668704", // +504 8866-8704, wa.me link format
  supportEmail: "soporte@miviatour.com",
  reviewInvitationFrom: "no-reply@miviatour.com",
  helpEmail: "ayuda@miviatour.com",
  defaultCurrency: "USD" as const,
  social: {
    facebook: "https://www.facebook.com/viatourTrips",
    instagram: "https://www.instagram.com/viatour.inc/",
    tiktok: "https://www.tiktok.com/@miviatour",
  },
  // Add approved, public post URLs here before publishing social embeds.
  socialReels: {
    instagram: [] as string[],
    tiktok: [] as string[],
  },
} as const;
