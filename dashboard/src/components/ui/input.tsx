import * as React from "react"

import { cn } from "../../lib/utils"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
        return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full border px-4 py-2 text-sm",
          "ring-offset-background transition-colors duration-150",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-60 ",

          // Theme-specific surface and border
          "border-border bg-secondary/40 text-foreground hover:chronicle-rule-strong",

          // Placeholder styling
          "placeholder:text-muted-foreground placeholder:font-light",

          // Shape: rounded for standard, rectangular for editorial
          "rounded-none",

          // Focus styles - always use focus-visible for accessibility
          "focus:outline-none focus-visible:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]",

          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
