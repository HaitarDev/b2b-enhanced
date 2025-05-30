"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
          <CardDescription className="font-sans">
            Your best performing posters by sales and revenue for{" "}
            {formattedDateRange}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : posters.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-muted-foreground">
              No poster sales data available for this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poster</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posters.map((poster) => (
                  <TableRow key={poster.id}>
                    <TableCell className="font-medium font-sans">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md overflow-hidden relative">
                          <Image
                            src={poster.image || "/placeholder.svg"}
                            alt={poster.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="line-clamp-1">{poster.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-sans">
                      {poster.sales}
                    </TableCell>
                    <TableCell className="text-right font-sans">
                      €{poster.revenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
