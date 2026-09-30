import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { uniqueSlug } from "@/lib/guide-utils";

function textOf(node: ReactNode): string {
  return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : "").join("");
}

// Guide sections (# to ###) render as <h2> with the same anchors guideOutline() lists, so the
// contents list and shared links (#pasaporte-vigente) land on the right heading.
export function Markdown({ children }: { children: string }) {
  const seen = new Map<string, number>();
  const section = ({ children: heading }: { children?: ReactNode }) => <h2 id={uniqueSlug(textOf(heading).trim(), seen)} className="t-h2 scroll-mt-28">{heading}</h2>;
  return <div className="blog-markdown measure t-body"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ h1: section, h2: section, h3: section, h4: ({ children: heading }) => <h3 className="t-h3">{heading}</h3>, h5: ({ children: heading }) => <h3 className="t-h3">{heading}</h3>, h6: ({ children: heading }) => <h3 className="t-h3">{heading}</h3>, img: ({ alt }) => <span className="t-small text-ink-soft">{alt || "Imagen de la publicación"}</span> }}>{children}</ReactMarkdown></div>;
}
