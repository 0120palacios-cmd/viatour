"use client";

import { Dialog } from "radix-ui";

// shadcn/ui Sheet composition, using viatour tokens and a full-screen mobile panel.
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;

export function SheetContent({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas" />
      <Dialog.Content aria-describedby={undefined} className="mobile-sheet fixed inset-0 z-50 overflow-y-auto bg-canvas text-ink">
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
