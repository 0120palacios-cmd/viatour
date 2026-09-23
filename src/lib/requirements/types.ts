export type RequirementsQuery = {
  nacionalidad: string;
  destino: string;
  transitos?: string;
  fechas?: string;
};

export type RequirementsData = {
  visaRequirement: string;
  allowedStay: string;
  passportRules: string[];
  transitRequirements?: string;
  notes?: string[];
  updatedAt?: string;
  referential: boolean;
};

export type RequirementsResult = {
  status: "ok" | "unknown" | "error" | "region" | "default";
  data?: RequirementsData;
  sourceUrl?: string;
  provider: string;
};

export interface RequirementsProvider {
  check(query: RequirementsQuery): Promise<RequirementsResult>;
}
