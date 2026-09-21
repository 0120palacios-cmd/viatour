import "server-only";

import type { RequirementsProvider } from "./types";

// Reserved adapter slot. Add the Sherpa integration here without changing the route or UI.
export const sherpaProvider: RequirementsProvider = {
  async check() {
    return { status: "unknown", provider: "sherpa" };
  },
};
