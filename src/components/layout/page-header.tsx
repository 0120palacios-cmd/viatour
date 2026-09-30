import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

// One header for every public page: where you are, what the page is, and (optionally) the next step.
export function PageHeader({ title, intro, breadcrumbs, actions, children, className = "" }: { title: ReactNode; intro?: ReactNode; breadcrumbs?: readonly BreadcrumbItem[]; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return <header className={`space-y-6 pb-8 pt-8 sm:pb-12 sm:pt-12 ${className}`}>
    {breadcrumbs && breadcrumbs.length > 1 && <Breadcrumbs items={breadcrumbs} schema={false} />}
    <div className="max-w-3xl space-y-4">
      <h1 className="t-h1">{title}</h1>
      {intro && <p className="t-body-lg measure text-ink-soft">{intro}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    {children}
  </header>;
}
