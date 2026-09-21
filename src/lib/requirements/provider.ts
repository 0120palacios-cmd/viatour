import "server-only";

import { offlineProvider } from "./offline";
import { sherpaProvider } from "./sherpa";
import { travelBuddyProvider } from "./travelbuddy";
import type { RequirementsProvider } from "./types";

export function getRequirementsProvider(): RequirementsProvider {
  const configured = process.env.REQUIREMENTS_PROVIDER?.trim().toLowerCase();
  if (configured === "offline") return offlineProvider;
  if (configured === "sherpa") return sherpaProvider;
  if (configured === "travelbuddy") return travelBuddyProvider;
  return process.env.RAPIDAPI_VISA_KEY ? travelBuddyProvider : offlineProvider;
}
