import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 t-body text-ink transition-colors duration-(--duration-fast) ease-out focus-visible:border-brand selection:bg-brand selection:text-canvas file:border-0 file:bg-canvas file:text-ink placeholder:text-ink-soft disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error",
        className
      )}
      {...props}
    />
  )
}

export { Input }
