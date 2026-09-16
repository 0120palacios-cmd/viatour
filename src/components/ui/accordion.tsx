"use client";
import { Accordion as Primitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

export const Accordion = Primitive.Root;
export function AccordionItem(props: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item {...props} className="border-b border-line" />;
}
export function AccordionTrigger({ children, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Header className="t-h3"><Primitive.Trigger {...props} className="group flex w-full items-center justify-between gap-4 rounded-btn py-6 text-left hover:text-brand"><span>{children}</span><ChevronDown size={24} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-brand transition-transform duration-(--duration-fast) group-data-[state=open]:rotate-180" /></Primitive.Trigger></Primitive.Header>;
}
export function AccordionContent({ children, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content {...props}><div className="t-body measure whitespace-pre-line pb-6 text-ink-soft">{children}</div></Primitive.Content>;
}
