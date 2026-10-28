"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  useEffect(() => {
    const saved = window.localStorage.getItem("finance-theme");
    const useDark = saved === "dark";
    document.documentElement.classList.toggle("dark", useDark);
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("finance-theme", nextDark ? "dark" : "light");
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle color theme" title="Toggle color theme">
      <Sun className="size-4.5 dark:hidden" /><Moon className="hidden size-4.5 dark:block" />
    </Button>
  );
}