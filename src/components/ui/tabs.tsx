"use client";

import { Tabs as Primitive } from "radix-ui";
import type { ComponentProps } from "react";

export const Tabs = Primitive.Root;
export function TabsList(props: ComponentProps<typeof Primitive.List>) {
  return <Primitive.List {...props} className="grid grid-cols-2 gap-2 border-b border-line p-4 sm:grid-cols-4 sm:p-6" />;
}
export function TabsTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger {...props} className="t-small flex min-h-12 items-center justify-center gap-2 rounded-btn px-3 py-3 text-ink-soft transition-colors duration-(--duration-fast) ease-out hover:bg-surface focus-visible:outline-brand data-[state=active]:bg-brand-tint data-[state=active]:text-brand" />;
}
export function TabsContent(props: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content {...props} className="p-4 sm:p-8" />;
}
