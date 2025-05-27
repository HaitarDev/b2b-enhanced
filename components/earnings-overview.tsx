"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  BanknoteIcon,
  BarChart3Icon,
  PercentIcon,
  InfoIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEarningsData } from "@/hooks/use-earnings-data";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyDisplay } from "@/components/currency-display";
import { formatCurrency } from "@/lib/utils";

export function EarningsOverview() {
  const { data, isLoading, dateRange, formattedDateRange, updateDateRange } =
    useEarningsData();

  // Log component data for debugging
  console.log("EarningsOverview rendering with:", {
    data,
    isLoading,
    hasData: !!data,
    earnings: data?.earnings,
    sales: data?.sales,
  });

  // Handle date range changes
  const handleDateRangeChange = (
    start: Date | undefined,
    end: Date | undefined,
    preset?: string
  ) => {
    console.log("EarningsOverview date range changed:", { start, end, preset });
    updateDateRange(start, end, preset);
  };

  // Make sure we have default values if data is missing
  const earnings = data?.earnings ?? 0;
  const sales = data?.sales ?? 0;
  const commission = data?.commission ?? 30;
  const hasRefunds = data?.refunds && data.refunds > 0;

  // Use net earnings if refunds are present
  const displayedEarnings =
    hasRefunds && data?.netEarnings !== undefined ? data.netEarnings : earnings;

  // Add refund information text if refunds are present
  const earningsLabel = hasRefunds ? (
    <span className="text-xs text-muted-foreground">
      <span className="font-medium text-destructive">After refunds</span>{" "}
      (Refunded amount: {formatCurrency(data?.refunds || 0)})
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">
      For the selected period
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold">
          Earnings Overview{" "}
          {formattedDateRange ? `(${formattedDateRange})` : ""}
        </h2>
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          initialStartDate={dateRange.from}
          initialEndDate={dateRange.to}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <CurrencyDisplay
                amount={displayedEarnings}
                sourceCurrency="GBP"
                showApprox={true}
              />
            )}
            <div className="text-xs text-muted-foreground">{earningsLabel}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">{sales}</div>
            )}
            <div className="text-xs text-muted-foreground">
              Posters sold in this period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commission Rate
            </CardTitle>
            <PercentIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{commission}%</div>
            <div className="text-xs text-muted-foreground">
              Your current commission rate
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
