"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useCurrency } from "@/hooks/use-currency";
import { SupportedCurrency } from "@/lib/currency";
import { eventBus, APP_EVENTS } from "@/lib/events";

interface CurrencyContextType {
  userCurrency: SupportedCurrency;
  setUserCurrency: (currency: SupportedCurrency) => Promise<boolean>;
  isLoading: boolean;
  convert: (
    amount: number,
    fromCurrency?: SupportedCurrency
  ) => Promise<number>;
  format: (amount: number) => string;
  version: number;
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
  // Keep track of whether we're handling an event
  const isHandlingEventRef = useRef(false);
  // Keep track of the last processed currency
  const lastProcessedCurrencyRef = useRef<SupportedCurrency | null>(null);

  // Listen for currency change events to sync context state
  useEffect(() => {
    const unsubscribe = eventBus.on(
      APP_EVENTS.CURRENCY_CHANGED,
      async (newCurrency: SupportedCurrency) => {
        // Guard against recursive calls
        if (isHandlingEventRef.current) {
          return;
        }

        // Skip if we just processed this currency (debounce)
        if (lastProcessedCurrencyRef.current === newCurrency) {
          return;
        }

        // This will help ensure the provider's internal state stays in sync
        // with any currency changes triggered from components
        if (newCurrency !== currencyState.userCurrency) {
          try {
            // Set the flag to prevent recursive event handling
            isHandlingEventRef.current = true;
            lastProcessedCurrencyRef.current = newCurrency;

            // Update the currency - this is a lightweight operation
            // that doesn't trigger full re-fetches
            await currencyState.setUserCurrency(newCurrency);

            // Reset the processed currency after a short delay
            // This allows processing the same currency again after a while
            setTimeout(() => {
              lastProcessedCurrencyRef.current = null;
            }, 1000);
          } finally {
            // Always reset the flag
            isHandlingEventRef.current = false;
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currencyState.userCurrency, currencyState.setUserCurrency]);

  // Use memo to prevent unnecessary re-renders of the context value
  const contextValue = React.useMemo(
    () => currencyState,
    [currencyState.userCurrency, currencyState.isLoading, currencyState.version]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}
