import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Loading skeleton components with shimmer animation
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-10 w-full" />
 *
 */

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden bg-muted",
          "rounded-none",
          "before:absolute before:inset-0",
          "before:-translate-x-full",
          "before:animate-shimmer",
          "before:bg-gradient-to-r",
          "before:from-transparent before:via-white/10 before:to-transparent",
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
