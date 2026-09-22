import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./src/lib/sentry";

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
});
