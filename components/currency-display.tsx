"use client";

import { useState, useEffect } from "react";
import { SupportedCurrency, formatCurrency } from "@/lib/currency";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyContext } from "./currency-provider";

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
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(true);
  const { userCurrency, convert, format, isLoading } = useCurrencyContext();

  useEffect(() => {
    const doConversion = async () => {
      if (amount === undefined || amount === null) {
        setConvertedAmount(null);
        setIsConverting(false);
        return;
      }

      setIsConverting(true);
      try {
        // Only convert if currencies are different
        if (sourceCurrency !== userCurrency) {
          const converted = await convert(amount, sourceCurrency);
          setConvertedAmount(converted);
        } else {
          setConvertedAmount(amount);
        }
      } catch (error) {
        console.error("Error converting currency:", error);
        setConvertedAmount(amount); // Fallback to original amount
      } finally {
        setIsConverting(false);
      }
    };

    doConversion();
  }, [amount, sourceCurrency, userCurrency, convert]);

  if (isLoading || isConverting) {
    return <Skeleton className="h-6 w-24" />;
  }

  // No need to show approximation if currencies are the same
  const needsConversion = sourceCurrency !== userCurrency;

  return (
    <div className={`flex flex-col ${className}`}>
      {needsConversion && showApprox ? (
        <>
          {/* Original amount always in GBP */}
          <div className="text-2xl font-semibold">
            {formatCurrency(amount, sourceCurrency)}
          </div>

          {/* Approximation with tooltip */}
          <div className="text-xs text-muted-foreground flex items-center">
            <span className="font-medium mr-1">Approx.</span>{" "}
            {formatCurrency(convertedAmount || 0, userCurrency)}
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
        // Simple display for same currency
        <div className="text-2xl font-semibold">
          {formatCurrency(amount, userCurrency)}
        </div>
      )}
    </div>
  );
}
