"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon, Calendar, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardData,
  DashboardFilter,
  DateRange,
} from "@/hooks/use-dashboard-data";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { DateRange as DateRangeType } from "react-day-picker";
import { cn } from "@/lib/utils";

export function SectionCards() {
  const {
    data,
    isLoading,
    timeRange,
    setTimeRange,
    customDateRange,
    setCustomDateRange,
    dateRange,
    setDateRange,
  } = useDashboardData();

  const handleDateRangeSelect = (range: DateRangeType | undefined) => {
    if (range?.from && range.to) {
      setDateRange({
        from: range.from,
        to: range.to,
      });
      setCustomDateRange({
        startDate: format(range.from, "yyyy-MM-dd"),
        endDate: format(range.to, "yyyy-MM-dd"),
      });
      setTimeRange("custom");
    }
  };

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold">Dashboard Overview</h2>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(value) => {
              setTimeRange(value as DashboardFilter);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 px-3">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(
                        dateRange.to,
                        "MMM d, yyyy"
                      )}`
                    : "Select dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col space-y-2 p-2">
                  <div className="rounded-md border">
                    <CalendarComponent
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                      classNames={{
                        caption_label: "text-sm font-medium",
                        head_cell: "text-muted-foreground text-xs font-medium",
                        cell: cn(
                          "h-8 w-8 text-center text-sm p-0 relative aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:opacity-100 first:rounded-l-md last:rounded-r-md"
                        ),
                        day: cn(
                          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
                        ),
                        day_today: "bg-accent text-accent-foreground",
                        day_selected: "bg-primary text-primary-foreground",
                        day_range_middle:
                          "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        const today = new Date();
                        handleDateRangeSelect({
                          from: today,
                          to: today,
                        });
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        const today = new Date();
                        const last7 = new Date(today);
                        last7.setDate(today.getDate() - 7);
                        handleDateRangeSelect({
                          from: last7,
                          to: today,
                        });
                      }}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        const today = new Date();
                        const last30 = new Date(today);
                        last30.setDate(today.getDate() - 30);
                        handleDateRangeSelect({
                          from: last30,
                          to: today,
                        });
                      }}
                    >
                      Last 30 days
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-semibold">
                {data?.stats.approvedProductsCount || 0}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Products in Shop
              <br />
              for the selected period
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-semibold">
                {data?.stats.totalSales || 0}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Items sold
              <br />
              for the selected period
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                £{data?.stats.totalRevenue.toFixed(2) || "0.00"}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Approx.</span> £
              {isLoading
                ? "..."
                : ((data?.stats.totalRevenue || 0) * 1.19).toFixed(2)}{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3 w-3 inline-block ml-1 align-text-bottom relative -top-[1px] text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      This is an approximate value based on current exchange
                      rates. Actual earnings may vary slightly.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <br />
              Before commission
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                £{data?.stats.totalCommission.toFixed(2) || "0.00"}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Approx.</span> £
              {isLoading
                ? "..."
                : ((data?.stats.totalCommission || 0) * 1.19).toFixed(2)}{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3 w-3 inline-block ml-1 align-text-bottom relative -top-[1px] text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      This is an approximate value based on current exchange
                      rates. Actual earnings may vary slightly.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <br />
              30% Commission
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
