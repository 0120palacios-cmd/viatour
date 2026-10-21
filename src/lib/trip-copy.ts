import { createTranslator } from "next-intl";
import es from "../../messages/es.json";

// The traveller wording (stages, next steps, labels) for documents and emails, read from the same
// messages the portal uses, so the PDF, the email and Mi viaje never describe a trip differently.
export function tripCopy() {
  return createTranslator({ locale: "es", messages: es, namespace: "trip" });
}
