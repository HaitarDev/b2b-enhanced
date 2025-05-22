"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductTable } from "./product-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useProductData, getDateRange } from "@/hooks/use-product-data";
import { DateRange, DateRangeOption } from "@/components/date-range-filter";
import { format } from "date-fns";

export function PosterTableContainer() {
  const [dateOption, setDateOption] = useState<DateRangeOption>("this_month");
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange("this_month")
  );
  const [retryCount, setRetryCount] = useState(0);
  const [isRangeChanging, setIsRangeChanging] = useState(false);

  const {
    data: products,
    isLoading: isProductLoading,
    isError,
    error,
    refetch,
    isRefetching,
    isSuccess,
  } = useProductData(dateRange);

  // Calculate the actual loading state
  const isLoading = isProductLoading || isRefetching || isRangeChanging;

  // Auto-retry once if there's an error
  useEffect(() => {
    if (isError && retryCount === 0) {
      console.log("[PosterTable] Auto-retrying after error...");
      const timer = setTimeout(() => {
        setRetryCount(1);
        refetch();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isError, retryCount, refetch]);

  // Reset retry count when date range changes
  useEffect(() => {
    setRetryCount(0);
  }, [dateRange]);

  // Handle date range change from the filter
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    console.log("[PosterTable] Date range changed:", {
      from: newRange.from ? format(newRange.from, "yyyy-MM-dd") : undefined,
      to: newRange.to ? format(newRange.to, "yyyy-MM-dd") : undefined,
    });

    // Set loading state before changing date
    setIsRangeChanging(true);

    // Update the date range
    setDateRange(newRange);

    // If this is triggered by selecting a preset, update the option accordingly
    if (newRange.from && newRange.to) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayDiff = Math.round(
        (today.getTime() - newRange.from.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine which preset this range matches, if any
      let newOption: DateRangeOption = "custom";
      if (dayDiff === 7) {
        newOption = "7d";
      } else if (dayDiff === 30) {
        newOption = "30d";
      } else if (dayDiff === 90) {
        newOption = "90d";
      } else if (dayDiff === 180) {
        newOption = "180d";
      } else if (
        newRange.from.getDate() === 1 &&
        newRange.from.getMonth() === now.getMonth() &&
        newRange.from.getFullYear() === now.getFullYear()
      ) {
        newOption = "this_month";
      }

      console.log(`[PosterTable] Setting date option to: ${newOption}`);
      setDateOption(newOption);
    }
  }, []);

  // Handle date option change from the dropdown
  const handleDateOptionChange = useCallback((option: DateRangeOption) => {
    console.log(`[PosterTable] Date option changed to ${option}`);

    // Set loading state before changing date
    setIsRangeChanging(true);

    // Update the date option and range
    setDateOption(option);
    const newRange = getDateRange(option);
    setDateRange(newRange);
  }, []);

  // Clear the loading state when products are loaded
  useEffect(() => {
    // If products have loaded (either successfully or empty array)
    if (!isProductLoading && !isRefetching && products !== undefined) {
      // Small delay to prevent flickering
      const timer = setTimeout(() => {
        setIsRangeChanging(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isProductLoading, isRefetching, products]);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    console.log("[PosterTable] Manual refresh requested");
    setIsRangeChanging(true);
    refetch();
  }, [refetch]);

  // Handle error state
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4 mx-4 lg:mx-6">
        <AlertTitle>Error loading your products</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <p>
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Log loading state changes for debugging
  useEffect(() => {
    console.log(
      `[PosterTable] Loading state: isLoading=${isLoading}, isRangeChanging=${isRangeChanging}, isProductLoading=${isProductLoading}, isRefetching=${isRefetching}`
    );
  }, [isLoading, isRangeChanging, isProductLoading, isRefetching]);

  return (
    <div className="flex flex-col gap-4">
      {/* Add manual refresh button */}
      <div className="flex justify-end px-4 lg:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <ProductTable
        products={products || []}
        isLoading={isLoading}
        isRefreshing={isRefetching}
        onDateRangeChange={handleDateRangeChange}
        onDateOptionChange={handleDateOptionChange}
        currentDateOption={dateOption}
        dateRange={dateRange}
      />
    </div>
  );
}
