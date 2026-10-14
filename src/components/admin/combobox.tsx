"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { matchesQuery, searchText } from "@/lib/catalog";
import { cn } from "cn";

export type ComboOption = { id: string; label: string; detail?: string; group?: string };

// Searchable picker following the WAI-ARIA combobox pattern: arrows move, Enter picks, Escape closes,
// the active option is announced through aria-activedescendant. Search ignores accents and case and
// needs every typed word. Picking clears the field: it selects a record, it does not hold a value.
export function Combobox({ label, options, onSelect, placeholder, hint, emptyText = "Sin resultados.", className, max = 8 }: { label: string; options: ComboOption[]; onSelect: (option: ComboOption) => void; placeholder?: string; hint?: string; emptyText?: string; className?: string; max?: number }) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = hint ? `${id}-hint` : undefined;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const indexed = useMemo(() => options.map(option => ({ option, haystack: searchText(option.label, option.detail) })), [options]);
  const results = useMemo(() => (query.trim() ? indexed.filter(item => matchesQuery(item.haystack, query)) : indexed).slice(0, max).map(item => item.option), [indexed, query, max]);
  const choose = (option: ComboOption) => { onSelect(option); setQuery(""); setOpen(false); setActive(0); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(index => Math.min(results.length - 1, open ? index + 1 : 0)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter" && open && results[active]) { event.preventDefault(); choose(results[active]); }
    else if (event.key === "Escape") { if (open) event.preventDefault(); setOpen(false); }
  };
  return <div className={cn("relative min-w-0", className)}>
    <label htmlFor={id} className="mb-1 block t-small font-semibold text-ink">{label}</label>
    <div className="relative">
      <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input ref={input} id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-describedby={hintId}
        aria-activedescendant={open && results[active] ? `${id}-option-${active}` : undefined} autoComplete="off" placeholder={placeholder}
        className="h-11 w-full min-w-0 rounded-btn border border-line bg-canvas pl-9 pr-3 text-ink transition-colors focus-visible:border-brand"
        value={query} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
    </div>
    {hint ? <p id={hintId} className="mt-1 text-[13px] leading-snug text-ink-soft">{hint}</p> : null}
    <ul id={listId} role="listbox" aria-label={label} hidden={!open} className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-card border border-line bg-canvas p-1 shadow-md">
      {results.length ? results.map((option, index) => <li key={option.id} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onMouseDown={event => { event.preventDefault(); choose(option); }} onMouseEnter={() => setActive(index)}
        className={cn("cursor-pointer rounded-btn px-3 py-2", index === active ? "bg-brand-tint" : "")}>
        {option.group && (index === 0 || results[index - 1].group !== option.group) ? <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{option.group}</span> : null}
        <span className="block font-semibold text-ink">{option.label}</span>
        {option.detail ? <span className="block t-small text-ink-soft">{option.detail}</span> : null}
      </li>) : <li className="px-3 py-2 t-small text-ink-soft" role="option" aria-selected={false} aria-disabled="true">{emptyText}</li>}
    </ul>
  </div>;
}
