import "server-only";

import { offlineProvider } from "./offline";
import { travelBuddyProvider } from "./travelbuddy";
import type { RequirementsProvider } from "./types";

export function getRequirementsProvider(): RequirementsProvider {
  return {
    async check(query) {
      const live = await travelBuddyProvider.check(query);
      if (live.status === "ok" || live.status === "region" || live.status === "default") return live;
      return offlineProvider.check(query);
    },
  };
}
