import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "ETB" | "USD" = "ETB") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-ET", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}