"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { DateRangePicker } from "@/components/date-range-picker";
import { Loader2 } from "lucide-react";
import { useEarningsData } from "@/hooks/use-earnings-data";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export function TopSellingPosters() {
  const { data, isLoading, dateRange, formattedDateRange, updateDateRange } =
    useEarningsData();

  // Log component data for debugging
  console.log("TopSellingPosters rendering with:", {
    data,
    isLoading,
    hasData: !!data,
    posterCount: data?.topSellingPosters?.length,
    posters: data?.topSellingPosters,
  });

  // Ensure we have a valid array of posters and filter out those with 0 sales
  const posters = (data?.topSellingPosters || []).filter(
    (poster) => poster.sales > 0
  );

  // Handle date range changes
  const handleDateRangeChange = (
    start: Date | undefined,
    end: Date | undefined,
    preset?: string
  ) => {
    console.log("TopSellingPosters date range changed:", {
      start,
      end,
      preset,
    });
    updateDateRange(start, end, preset);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight font-sans">
            Top Selling Posters
          </h2>
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - no data available
  if (!data || !data.topSellingPosters || data.topSellingPosters.length === 0) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight font-sans">
            Top Selling Posters
          </h2>
          <DateRangePicker
            onDateRangeChange={handleDateRangeChange}
            initialStartDate={dateRange.from}
            initialEndDate={dateRange.to}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Posters</CardTitle>
            <CardDescription>
              Your best performing posters for{" "}
              {formattedDateRange || "the selected period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">No poster sales yet</p>
                <p className="text-sm">
                  Sales data will appear here once you start making sales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No sales in filtered data
  if (posters.length === 0) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight font-sans">
            Top Selling Posters
          </h2>
          <DateRangePicker
            onDateRangeChange={handleDateRangeChange}
            initialStartDate={dateRange.from}
            initialEndDate={dateRange.to}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Posters</CardTitle>
            <CardDescription>
              Your best performing posters for{" "}
              {formattedDateRange || "the selected period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">No sales in this period</p>
                <p className="text-sm">
                  Try selecting a different date range to see sales data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display top selling posters
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight font-sans">
          Top Selling Posters
        </h2>
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          initialStartDate={dateRange.from}
          initialEndDate={dateRange.to}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Posters</CardTitle>
          <CardDescription className="font-sans">
            Your best performing posters by sales and revenue for{" "}
            {formattedDateRange || "the selected period"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {posters.slice(0, 5).map((poster, index) => (
            <div key={poster.id} className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <span className="text-sm font-medium">#{index + 1}</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {poster.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {poster.sales} {poster.sales === 1 ? "sale" : "sales"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatCurrency(poster.revenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(poster.revenue * 0.3)} commission
                </p>
              </div>
            </div>
          ))}
          {posters.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sales data available for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
