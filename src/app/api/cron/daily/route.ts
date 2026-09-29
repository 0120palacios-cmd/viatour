import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDailyDigest } from "@/lib/daily-job";
import { captureNotificationFailure } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called once a day by Vercel Cron (GET with "Authorization: Bearer $CRON_SECRET")
// or by .github/workflows/daily.yml. Without CRON_SECRET the route is disabled.
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const report = await sendDailyDigest(createAdminClient(), {
      autoReviews: process.env.AUTO_REVIEW_INVITES === "1",
      customerReminders: process.env.CUSTOMER_REMINDERS === "1",
      docRetentionDays: Number(process.env.DOC_RETENTION_DAYS) || 0,
    });
    return Response.json({ ok: true, date: report.today, sections: report.sections.length, actions: report.actions.length, problems: report.problems.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    captureNotificationFailure("daily_digest", new Date().toISOString().slice(0, 10), error);
    return Response.json({ ok: false }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = handle;
export const POST = handle;
