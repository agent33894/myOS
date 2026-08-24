import { cn } from "../../lib/utils";

export function ChronicleCheckmark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("chronicle-checkmark", className)}
      viewBox="0 0 18 15"
      aria-hidden="true"
    >
      <path
        pathLength="1"
        d="M2.4 8.2C4.1 9.7 5.2 10.9 6.7 12.1C9.1 8.6 11.7 5.6 15.7 2.7"
      />
    </svg>
  );
}
