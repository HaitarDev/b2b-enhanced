import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "GBP"
): string {
  const currencySymbols: Record<string, string> = {
    GBP: "£",
    EUR: "€",
    USD: "$",
    JPY: "¥",
    // Add more as needed
  };

  const symbol = currencySymbols[currency] || currency;

  return `${symbol}${new Intl.NumberFormat("en-GB", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}
