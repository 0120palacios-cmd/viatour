"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Asks inside the page instead of the browser's confirm(), which blocks the whole tab (and screen readers lose
// their place). The first press shows the question; "Sí" runs the action.
export function ConfirmButton({ label, question, confirmLabel = "Sí", onConfirm, className }: { label: string; question: string; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button type="button" variant="ghost" className={className} onClick={() => setAsking(true)}>{label}</Button>;
  return <span role="alertdialog" aria-label={question} className="inline-flex flex-wrap items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2">
    <span className="t-small font-semibold">{question}</span>
    <Button type="button" className="min-h-10 px-3" autoFocus onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</Button>
    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => setAsking(false)}>No</Button>
  </span>;
}
