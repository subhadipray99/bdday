import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("skeleton-shimmer", className)}
      {...props}
    />
  );
}

export { Skeleton }
