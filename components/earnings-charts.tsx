"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useEarningsData } from "@/hooks/use-earnings-data";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

// Define chart configurations
const earningsChartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const salesChartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

// CSS variables for chart colors
const chartStyles = `
  :root {
    --color-earnings: hsl(var(--chart-1));
    --color-sales: hsl(var(--chart-2));
  }
`;

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  dataKey: string;
  formatter: (value: number) => string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  dataKey,
  formatter,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm border rounded-md shadow-md p-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">
          {dataKey}: {formatter(payload[0].value)}
        </p>
      </div>
    );
  }

  return null;
};

export function EarningsCharts() {
  const { data, isLoading, dateRange, formattedDateRange, updateDateRange } =
    useEarningsData();

  const [activeTab, setActiveTab] = useState("earnings");

  // Log component data for debugging
  console.log("EarningsCharts rendering with:", {
    data,
    isLoading,
    hasData: !!data,
    chartData: data?.chartData,
  });

  // Handle date range picker changes
  const handleDateRangeChange = (
    start: Date | undefined,
    end: Date | undefined,
    preset?: string
  ) => {
    console.log("EarningsCharts date range changed:", { start, end, preset });
    updateDateRange(start, end, preset);
  };

  // Get chart data with fallbacks
  const monthlyEarningsData = data?.chartData?.earnings || [];
  const monthlySalesData = data?.chartData?.sales || [];

  // Check if we have any real data
  const hasEarningsData = monthlyEarningsData.some((item) => item.earnings > 0);
  const hasSalesData = monthlySalesData.some((item) => item.sales > 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chartStyles }} />
      <div className="space-y-4">
        <Tabs
          defaultValue="earnings"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-lg font-semibold">Performance Charts</h2>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
              <DateRangePicker
                onDateRangeChange={handleDateRangeChange}
                initialStartDate={dateRange.from}
                initialEndDate={dateRange.to}
              />
              <TabsList>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="earnings" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <CardTitle>Monthly Earnings</CardTitle>
                    <CardDescription>
                      Your earnings over time, showing monthly revenue trends
                      {formattedDateRange ? ` for ${formattedDateRange}` : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : !hasEarningsData ? (
                  <div className="flex justify-center items-center h-full text-muted-foreground">
                    No earnings data available for this period
                  </div>
                ) : (
                  <ChartContainer
                    config={earningsChartConfig}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={monthlyEarningsData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorEarnings"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-earnings)"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-earnings)"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip
                          content={
                            <CustomTooltip
                              dataKey="Earnings"
                              formatter={(value: number) =>
                                formatCurrency(value)
                              }
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="earnings"
                          stroke="var(--color-earnings)"
                          fillOpacity={1}
                          fill="url(#colorEarnings)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <CardTitle>Monthly Sales</CardTitle>
                    <CardDescription>
                      Number of posters sold each month
                      {formattedDateRange ? ` for ${formattedDateRange}` : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : !hasSalesData ? (
                  <div className="flex justify-center items-center h-full text-muted-foreground">
                    No sales data available for this period
                  </div>
                ) : (
                  <ChartContainer
                    config={salesChartConfig}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlySalesData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <Tooltip
                          content={
                            <CustomTooltip
                              dataKey="Sales"
                              formatter={(value: number) => `${value} posters`}
                            />
                          }
                        />
                        <Bar
                          dataKey="sales"
                          fill="var(--color-sales)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
