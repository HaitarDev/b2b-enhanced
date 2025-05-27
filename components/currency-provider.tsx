"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useCurrency } from "@/hooks/use-currency";
import { SupportedCurrency } from "@/lib/currency";

interface CurrencyContextType {
  userCurrency: SupportedCurrency;
  setUserCurrency: (currency: SupportedCurrency) => Promise<boolean>;
  isLoading: boolean;
  convert: (
    amount: number,
    fromCurrency?: SupportedCurrency
  ) => Promise<number>;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function useCurrencyContext() {
  const context = useContext(CurrencyContext);

  // If no context is available, fall back to using the hook directly
  if (context === undefined) {
    console.warn(
      "Using useCurrency directly as fallback. Consider wrapping with CurrencyProvider for better performance."
    );
    return useCurrency();
  }

  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  // Use the hook directly, it's now more resilient
  const currencyState = useCurrency();

  return (
    <CurrencyContext.Provider value={currencyState}>
      {children}
    </CurrencyContext.Provider>
  );
}
