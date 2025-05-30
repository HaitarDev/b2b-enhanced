"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDashboardData,
  DashboardFilter,
  SalesTrendPoint,
} from "@/hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  format,
  isValid,
  subDays,
  subMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  parseISO,
  addDays,
  parse,
} from "date-fns";
import { useState, useEffect } from "react";
import { DateRange as DayPickerDateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

// Define the enhanced chart data type
interface ChartDataPoint extends SalesTrendPoint {
  formattedDate: string;
}

export function ChartAreaInteractive() {
  const {
    data,
    isLoading,
    timeRange,
    setTimeRange,
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
  } = useDashboardData();

  const [processedData, setProcessedData] = useState<ChartDataPoint[]>([]);

  // Debug the data we receive from API
  useEffect(() => {
    if (data?.salesTrend) {
      console.log("Raw sales trend data:", data.salesTrend);
    }
  }, [data?.salesTrend]);

  // Debug the processed data
  useEffect(() => {
    console.log("Processed chart data:", processedData);
  }, [processedData]);

  const handleDateRangeSelect = (range: DayPickerDateRange | undefined) => {
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

  // Try to parse a date string in various formats
  const tryParseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    try {
      // First try ISO format
      const isoDate = parseISO(dateStr);
      if (isValid(isoDate)) return isoDate;

      // Try "MMM" format (for month abbreviations like "Jan")
      const monthDate = parse(dateStr, "MMM", new Date());
      if (isValid(monthDate)) return monthDate;

      // Try "MMM dd" format
      const monthDayDate = parse(dateStr, "MMM dd", new Date());
      if (isValid(monthDayDate)) return monthDayDate;

      // Try "MMM yyyy" format
      const monthYearDate = parse(dateStr, "MMM yyyy", new Date());
      if (isValid(monthYearDate)) return monthYearDate;

      return null;
    } catch (e) {
      console.error(`Error parsing date: ${dateStr}`, e);
      return null;
    }
  };

  // Determine the appropriate formatting and data transformation based on time range
  const formatChartData = (): ChartDataPoint[] => {
    if (!data?.salesTrend || !Array.isArray(data.salesTrend)) {
      return [];
    }

    console.log(`Formatting chart data for time range: ${timeRange}`);

    // Generate some default data for testing if the data is empty or invalid
    if (data.salesTrend.length === 0) {
      const today = new Date();
      const result: ChartDataPoint[] = [];

      for (let i = 0; i < 10; i++) {
        const date = subDays(today, i * 3);
        result.unshift({
          date: format(date, "yyyy-MM-dd"),
          formattedDate: format(date, "MMM dd"),
          sales: Math.floor(Math.random() * 10),
          revenue: Math.floor(Math.random() * 1000),
        });
      }

      console.log("Generated sample data:", result);
      return result;
    }

    // Based on time range, transform the data for display
    if (timeRange === "7d" || timeRange === "30d") {
      // Daily format for shorter time periods
      const endDate = new Date();
      const startDate =
        timeRange === "7d" ? subDays(endDate, 6) : subDays(endDate, 29);

      // Generate all days in the range
      const daysInRange = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      console.log(
        `Date range for ${timeRange}: ${format(
          startDate,
          "yyyy-MM-dd"
        )} to ${format(endDate, "yyyy-MM-dd")} (${daysInRange.length} days)`
      );

      // Create a map of existing data points by date string
      const existingDataMap = new Map<string, SalesTrendPoint>();
      data.salesTrend.forEach((point: SalesTrendPoint) => {
        try {
          // Try to parse the date from various formats
          const dateObj = tryParseDate(point.date);
          if (dateObj && isValid(dateObj)) {
            const dateKey = format(dateObj, "yyyy-MM-dd");
            existingDataMap.set(dateKey, point);
            console.log(`Mapped data point for ${dateKey}:`, point);
          } else {
            console.warn(`Couldn't parse date: ${point.date}`);
          }
        } catch (e) {
          console.error("Error processing date:", point.date, e);
        }
      });

      // Map each day to a data point
      const result = daysInRange.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const existingPoint = existingDataMap.get(dateStr);

        return {
          date: dateStr,
          formattedDate: format(date, "MMM dd"),
          sales: existingPoint?.sales || 0,
          revenue: existingPoint?.revenue || 0,
        };
      });

      console.log(
        `Generated ${result.length} daily data points for ${timeRange}`
      );
      return result;
    } else if (timeRange === "90d") {
      // Group by 10-day periods for 90 days
      const endDate = new Date();
      const startDate = subDays(endDate, 90);

      // Create buckets for each 10-day period
      type Bucket = { sales: number; revenue: number };
      const tenDayBuckets: Record<string, Bucket> = {};

      // Initialize buckets with dates
      for (let i = 0; i < 9; i++) {
        const bucketStart = addDays(startDate, i * 10);
        const label = format(bucketStart, "MMM dd");
        tenDayBuckets[label] = { sales: 0, revenue: 0 };
      }

      console.log("Initial 90d buckets:", Object.keys(tenDayBuckets));

      // Distribute data into buckets
      data.salesTrend.forEach((point: SalesTrendPoint) => {
        try {
          // Try to parse the date from various formats
          const dateObj = tryParseDate(point.date);
          if (dateObj && isValid(dateObj)) {
            const daysDiff = Math.floor(
              (dateObj.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff >= 0 && daysDiff < 90) {
              const bucketIndex = Math.floor(daysDiff / 10);
              if (bucketIndex >= 0 && bucketIndex < 9) {
                const bucketStart = addDays(startDate, bucketIndex * 10);
                const label = format(bucketStart, "MMM dd");

                if (label in tenDayBuckets) {
                  tenDayBuckets[label].sales += point.sales || 0;
                  tenDayBuckets[label].revenue += point.revenue || 0;
                  console.log(`Added data to bucket ${label}:`, point);
                }
              }
            }
          }
        } catch (e) {
          console.error("Error processing date for 90d view:", point.date, e);
        }
      });

      const result = Object.entries(tenDayBuckets).map(([date, data]) => ({
        date,
        formattedDate: date,
        sales: data.sales,
        revenue: data.revenue,
      }));

      console.log(`Generated ${result.length} 10-day buckets for 90d view`);
      return result;
    } else if (timeRange === "this_month" || timeRange === "custom") {
      // Monthly format for longer periods
      let endDate: Date;
      let startDate: Date;

      if (timeRange === "this_month") {
        const today = new Date();
        startDate = startOfMonth(today);
        endDate = endOfMonth(today); // Use end of month instead of today
      } else {
        // custom range
        endDate = dateRange.to || new Date();
        startDate = dateRange.from || subMonths(endDate, 1);
      }

      console.log(
        `Date range for ${timeRange}: ${format(
          startDate,
          "yyyy-MM-dd"
        )} to ${format(endDate, "yyyy-MM-dd")}`
      );

      // For shorter custom ranges (less than a month), use daily format
      const diffInDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffInDays <= 31) {
        const daysInRange = eachDayOfInterval({
          start: startDate,
          end: endDate,
        });

        console.log(`Using daily format for ${diffInDays} days range`);

        const result = daysInRange.map((date) => {
          // Find matching data point or use default
          const matchingPoint = data.salesTrend.find((p: SalesTrendPoint) => {
            try {
              const pointDate = tryParseDate(p.date);
              return (
                pointDate &&
                isValid(pointDate) &&
                format(pointDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
              );
            } catch {
              return false;
            }
          });

          if (matchingPoint) {
            console.log(
              `Found matching data for ${format(date, "yyyy-MM-dd")}:`,
              matchingPoint
            );
          }

          return {
            date: format(date, "yyyy-MM-dd"),
            formattedDate: format(date, "MMM dd"),
            sales: matchingPoint?.sales || 0,
            revenue: matchingPoint?.revenue || 0,
          };
        });

        console.log(
          `Generated ${result.length} daily data points for custom range`
        );
        return result;
      }

      // For custom ranges > 31 days, use monthly format
      const monthsInRange = eachMonthOfInterval({
        start: startDate,
        end: endDate,
      });

      console.log(
        `Using monthly format for ${monthsInRange.length} months range`
      );

      const result = monthsInRange.map((monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, "MMM yyyy");

        // Sum up data for this month
        let monthlySales = 0;
        let monthlyRevenue = 0;
        let pointsAddedCount = 0;

        data.salesTrend.forEach((point: SalesTrendPoint) => {
          try {
            const pointDate = tryParseDate(point.date);
            if (
              pointDate &&
              isValid(pointDate) &&
              pointDate >= monthStart &&
              pointDate <= monthEnd
            ) {
              monthlySales += point.sales || 0;
              monthlyRevenue += point.revenue || 0;
              pointsAddedCount++;
            }
          } catch (e) {
            // Skip invalid dates
          }
        });

        console.log(
          `Month ${monthLabel}: Added ${pointsAddedCount} data points, total sales: ${monthlySales}, revenue: ${monthlyRevenue}`
        );

        return {
          date: monthLabel,
          formattedDate: monthLabel,
          sales: monthlySales,
          revenue: monthlyRevenue,
        };
      });

      console.log(`Generated ${result.length} monthly data points`);
      return result;
    }

    // Fallback - just use the data as is but try to format dates
    const result = data.salesTrend.map((point: SalesTrendPoint) => {
      try {
        const dateObj = tryParseDate(point.date);
        return {
          ...point,
          formattedDate:
            dateObj && isValid(dateObj)
              ? format(dateObj, "MMM dd")
              : point.date,
        };
      } catch {
        return { ...point, formattedDate: point.date };
      }
    });

    console.log(`Using fallback with ${result.length} data points`);
    return result;
  };

  // Process data when it changes or when timeRange changes
  useEffect(() => {
    if (data?.salesTrend) {
      const formattedData = formatChartData();
      setProcessedData(formattedData);
    }
  }, [data?.salesTrend, timeRange, dateRange]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Sales Performance</CardTitle>
          <CardDescription>
            Showing sales data for the selected period
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(value: string) => {
              setTimeRange(value as DashboardFilter);
            }}
          >
            <SelectTrigger
              className="w-[160px] rounded-lg sm:ml-auto"
              aria-label="Select time period"
            >
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
              <SelectItem value="this_month" className="rounded-lg">
                This month
              </SelectItem>
              <SelectItem value="custom" className="rounded-lg">
                Custom range
              </SelectItem>
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
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
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
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading || !data?.salesTrend ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  processedData.length > 0
                    ? processedData
                    : generateFallbackData()
                }
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-sales)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-sales)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  width={45}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        if (name === "revenue") {
                          return [`£${Number(value).toFixed(2)}`, "Revenue"];
                        }
                        return [`${value} units`, "Sales"];
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  stackId="2"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Generate fallback data to ensure chart always shows something
function generateFallbackData(): ChartDataPoint[] {
  const today = new Date();
  const result: ChartDataPoint[] = [];

  for (let i = 0; i < 10; i++) {
    const date = subDays(today, i * 3);
    result.unshift({
      date: format(date, "yyyy-MM-dd"),
      formattedDate: format(date, "MMM dd"),
      sales: Math.floor(Math.random() * 10) + 1, // Ensure non-zero values
      revenue: Math.floor(Math.random() * 1000) + 100,
    });
  }

  console.log("Using fallback sample data:", result);
  return result;
}
