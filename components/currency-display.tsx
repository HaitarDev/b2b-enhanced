"use client";

import { useState, useEffect, useReducer, useRef } from "react";
import {
  SupportedCurrency,
  formatCurrency,
  convertCurrency,
} from "@/lib/currency";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyContext } from "./currency-provider";
import { eventBus, APP_EVENTS } from "@/lib/events";

interface CurrencyDisplayProps {
  amount: number;
  sourceCurrency?: SupportedCurrency;
  showApprox?: boolean;
  className?: string;
  tooltipText?: string;
}

export function CurrencyDisplay({
  amount,
  sourceCurrency = "GBP", // Default to GBP for original values
  showApprox = true,
  className = "",
  tooltipText = "This is an approximate value based on current exchange rates. Actual amounts may vary slightly.",
}: CurrencyDisplayProps) {
  // Add a forceUpdate mechanism using reducer pattern
  const [updateCounter, forceUpdate] = useReducer((x) => x + 1, 0);

  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { userCurrency, isLoading, version } = useCurrencyContext();

  // Keep track of the current active currency for display
  const activeCurrencyRef = useRef<SupportedCurrency>(userCurrency);

  // Track if we're currently handling an event to prevent recursion
  const isHandlingEventRef = useRef(false);

  // Store the original amount to ensure we can convert properly
  const originalAmountRef = useRef(amount);

  // Add a timeout reference to prevent getting stuck in loading state
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update the original amount when it changes
  useEffect(() => {
    originalAmountRef.current = amount;
  }, [amount]);

  // Immediately update the active currency when it changes
  useEffect(() => {
    activeCurrencyRef.current = userCurrency;
    // Force conversion when currency changes
    setConvertedAmount(null);
    setIsConverting(true);
    forceUpdate();
  }, [userCurrency]);

  // Set up event listener for currency changes
  useEffect(() => {
    // Listen for currency changes from anywhere in the app
    const unsubscribe = eventBus.on(
      APP_EVENTS.CURRENCY_CHANGED,
      (newCurrency: SupportedCurrency) => {
        // Prevent handling our own events recursively
        if (isHandlingEventRef.current) {
          return;
        }

        try {
          isHandlingEventRef.current = true;

          // Force immediate conversion and re-render
          activeCurrencyRef.current = newCurrency;
          setConvertedAmount(null);
          setIsConverting(true);
          forceUpdate();

          // Safety timeout to prevent getting stuck in loading state
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            if (isConverting) {
              setIsConverting(false);
              // Trigger another conversion attempt
              forceUpdate();
            }
          }, 2000); // Fallback after 2 seconds
        } finally {
          // Always reset the handling flag after a short delay
          // This prevents immediate recursion but allows future events
          setTimeout(() => {
            isHandlingEventRef.current = false;
          }, 100);
        }
      }
    );

    // Clean up event listener and timeout
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Execute the conversion when needed
  useEffect(() => {
    // Track whether this effect is still the current one
    let isCurrent = true;

    // Only set loading state if we don't have a value yet or currency changed
    if (convertedAmount === null || sourceCurrency !== userCurrency) {
      setIsConverting(true);
    }

    const doConversion = async () => {
      // Use the original amount from ref to ensure we have the correct value
      const currentAmount = originalAmountRef.current;

      if (currentAmount === undefined || currentAmount === null) {
        if (isCurrent) {
          setConvertedAmount(null);
          setIsConverting(false);
        }
        return;
      }

      try {
        // Only convert if currencies are different
        if (sourceCurrency !== userCurrency) {
          const converted = await convertCurrency(
            currentAmount,
            sourceCurrency,
            userCurrency
          );

          // Only update state if this effect is still current
          if (isCurrent) {
            setConvertedAmount(converted);
          }
        } else {
          if (isCurrent) {
            setConvertedAmount(currentAmount);
          }
        }
      } catch (error) {
        console.error("Error converting currency:", error);
        if (isCurrent) {
          setConvertedAmount(currentAmount); // Fallback to original amount
        }
      } finally {
        if (isCurrent) {
          setIsConverting(false);
        }

        // Clear any safety timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };

    // Start the conversion
    doConversion();

    // Set a safety timeout to prevent infinite loading
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isConverting && isCurrent) {
        setIsConverting(false);
        if (convertedAmount === null) {
          setConvertedAmount(originalAmountRef.current); // Use original amount as fallback
        }
        forceUpdate(); // Force re-render to ensure we display something
      }
    }, 3000); // Safety timeout after 3 seconds

    // Cleanup function
    return () => {
      // Mark this effect as no longer current
      isCurrent = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [amount, sourceCurrency, userCurrency, version, updateCounter]); // Added updateCounter

  // Only show loading state during initial load, not during currency changes
  if (isLoading && convertedAmount === null) {
    return <Skeleton className="h-6 w-24" />;
  }

  // Always show content if we have a value, even if still converting
  // This prevents flickering between content and loading states
  const displayAmount = convertedAmount !== null ? convertedAmount : amount;

  // No need to show approximation if currencies are the same
  const needsConversion = sourceCurrency !== userCurrency;

  // Simple logic: Don't show approx if user currency is GBP or null
  const shouldShowApprox =
    showApprox && userCurrency !== "GBP" && userCurrency !== null;

  // Key the component based on currency to force complete re-rendering
  const displayKey = `currency-display-${userCurrency}-${sourceCurrency}-${version}-${updateCounter}`;

  return (
    <div key={displayKey} className={`flex flex-col ${className}`}>
      {needsConversion && shouldShowApprox ? (
        <>
          {/* Original amount always in source currency */}
          <div className="text-2xl font-semibold">
            {formatCurrency(amount, sourceCurrency)}
          </div>

          {/* Approximation with tooltip */}
          <div className="text-xs text-muted-foreground flex items-center">
            <span className="font-medium mr-1">Approx.</span>{" "}
            {isConverting ? (
              <Skeleton className="h-4 w-16 inline-block" />
            ) : (
              formatCurrency(displayAmount, userCurrency)
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-3 w-3 inline-block ml-1 align-text-bottom relative -top-[1px] text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      ) : (
        // Simple display for same currency or when approx should be hidden
        <div className="text-2xl font-semibold">
          {isConverting ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            formatCurrency(displayAmount, userCurrency)
          )}
        </div>
      )}
    </div>
  );
}
