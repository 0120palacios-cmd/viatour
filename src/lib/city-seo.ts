import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CityLocaleCopy = {
  h1: string;
  title: string;
  description: string;
  body: string[];
};

export type CitySeoPage = {
  slug: string;
  name: string;
  priority: 1 | 2;
  published: boolean;
  es: CityLocaleCopy;
  en: CityLocaleCopy;
};

function field(section: string, label: string) {
  const match = section.match(new RegExp(`^${label}: (.+)$`, "m"));
  if (!match) throw new Error(`Missing ${label} in city copy`);
  return match[1].trim();
}

function body(section: string, label: string, endLabel?: string) {
  const pattern = endLabel
    ? `^${label}:\\n([\\s\\S]*?)(?=^${endLabel}:)`
    : `^${label}:\\n([\\s\\S]*)`;
  const match = section.match(new RegExp(pattern, "m"));
  if (!match) throw new Error(`Missing ${label} in city copy`);
  return match[1].trim().split(/\r?\n/).filter(Boolean);
}

function parseCity(section: string, heading: string): CitySeoPage {
  const slug = field(section, "slug");
  const priority = heading.endsWith("Prioridad 1") ? 1 : 2;
  const name = heading.replace(/ — Prioridad [12]$/, "").replace(/^\d+\.\s*/, "").trim();
  return {
    slug,
    name,
    priority,
    published: priority === 1,
    es: {
      h1: field(section, "H1 \\(ES\\)"),
      title: field(section, "meta_titulo"),
      description: field(section, "meta_descripcion"),
      body: body(section, "cuerpo \\(ES\\)", "H1 \\(EN\\)"),
    },
    en: {
      h1: field(section, "H1 \\(EN\\)"),
      title: field(section, "meta_title \\(EN\\)"),
      description: field(section, "meta_description \\(EN\\)"),
      body: body(section, "body \\(EN\\)"),
    },
  };
}

const source = readFileSync(join(process.cwd(), "docs/city-copy.md"), "utf8");
const sections = source.split(/^## /m).slice(1).map(section => {
  const newline = section.search(/\r?\n/);
  return { heading: section.slice(0, newline), content: section.slice(newline + 1) };
});

if (sections.length !== 15) throw new Error(`Expected 15 city copy sections, found ${sections.length}`);

export const CITY_SEO_PAGES: CitySeoPage[] = sections.map(section => parseCity(section.content, section.heading));

export function getCitySeoPage(slug: string) {
  return CITY_SEO_PAGES.find(page => page.slug === slug) || null;
}
