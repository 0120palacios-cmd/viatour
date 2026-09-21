import { launchDestinations } from "@/lib/launch-destinations";

export const publishedRequirementDestinations = launchDestinations.map(destination => ({
  label: destination,
  value: destination,
}));
