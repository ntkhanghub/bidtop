"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

// Reads true only after client hydration, avoiding a server/client mismatch
// on the theme-dependent classes below (resolvedTheme is undefined server-side).
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const current = mounted ? resolvedTheme : "light";

  return (
    <div className="inline-flex rounded-full border border-border bg-muted/60 p-0.5">
      <button
        type="button"
        aria-label="Giao diện sáng"
        aria-pressed={current === "light"}
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1.5 transition-colors",
          current === "light"
            ? "bg-background text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Giao diện tối"
        aria-pressed={current === "dark"}
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1.5 transition-colors",
          current === "dark"
            ? "bg-background text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="size-3.5" />
      </button>
    </div>
  );
}
