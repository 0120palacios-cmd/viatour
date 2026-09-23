import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
export function Markdown({ children }: {
    children: string;
}) { return <div className="blog-markdown measure t-body"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ h1: ({ children }) => <h2 className="t-h2">{children}</h2>, h2: ({ children }) => <h2 className="t-h2">{children}</h2>, h3: ({ children }) => <h2 className="t-h2">{children}</h2>, h4: ({ children }) => <h3 className="t-h3">{children}</h3>, h5: ({ children }) => <h3 className="t-h3">{children}</h3>, h6: ({ children }) => <h3 className="t-h3">{children}</h3>, img: ({ alt }) => <span className="t-small text-ink-soft">{alt || "Imagen de la publicación"}</span> }}>{children}</ReactMarkdown></div>; }
