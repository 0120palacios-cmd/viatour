import type { ErrorEvent } from "@sentry/nextjs";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const secretPattern = /\b(?:bearer\s+|token|secret|password|authorization|api[-_]?key)[=: ]+[^\s,;]+/gi;

function scrubText(value: string) {
  return value.replace(emailPattern, "[redacted-email]").replace(secretPattern, "[redacted-secret]");
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  event.user = undefined;
  event.request = event.request ? {
    ...event.request,
    data: undefined,
    cookies: undefined,
    headers: undefined,
    query_string: undefined,
    url: event.request.url?.split("?")[0],
  } : undefined;
  event.extra = undefined;
  if (event.message) event.message = scrubText(event.message);
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(value => ({ ...value, value: value.value ? scrubText(value.value) : value.value }));
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({ ...breadcrumb, message: breadcrumb.message ? scrubText(breadcrumb.message) : undefined, data: undefined }));
  }
  if (event.tags) {
    event.tags = Object.fromEntries(Object.entries(event.tags).map(([key, value]) => [key, scrubText(String(value))]));
  }
  return event;
}
