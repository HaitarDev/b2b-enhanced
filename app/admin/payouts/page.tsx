"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Loader2,
  ChevronDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isSameMonth,
} from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

// Types for payouts
interface PayoutResult {
  creator_id: string;
  creator_name?: string;
  success: boolean;
  payout_id?: number;
  amount?: number;
  manualAmount?: number;
  error?: string;
  message?: string;
  currency?: string;
  products?: Array<{
    productId: string;
    title: string;
    revenue: number;
    sales: number;
    currency: string;
  }>;
}

interface ApiResponse {
  message: string;
  period: {
    start: string;
    end: string;
  };
  results: PayoutResult[];
  debug?: Record<string, any>;
}

interface ExistingPayout {
  id: number;
  creator_id: string;
  amount: number;
  status: "pending" | "completed";
  created_at: string;
  payout_month: {
    start: string;
    end: string;
  };
  name?: string;
  method?: "iban" | "paypal";
  currency?: string;
}

export default function AdminPayouts() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    subMonths(new Date(), 1)
  );
  const [processingResult, setProcessingResult] = useState<ApiResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [creatorName, setCreatorName] = useState<Record<string, string>>({});
  const [creatorCurrency, setCreatorCurrency] = useState<
    Record<string, string>
  >({});
  const [confirmingGeneration, setConfirmingGeneration] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, number>>(
    {}
  );
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  // Log current state of debugInfo on each render
  console.log("Current debugInfo state:", debugInfo);

  // Helper function to get first and last day of month
  const getMonthDateRange = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  };

  // Format month for display and API
  const formatMonthParam = (date: Date) => {
    return format(date, "yyyy-MM");
  };

  // Format month for display
  const formatMonthDisplay = (date: Date) => {
    return format(date, "MMMM yyyy");
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  // Format payout month for display
  const formatPayoutMonth = (payout: ExistingPayout): string => {
    const payoutMonth = payout.payout_month;

    if (!payoutMonth) {
      // Fallback to created_at date's month if payout_month is not available
      try {
        return format(new Date(payout.created_at), "MMMM yyyy");
      } catch {
        return "Unknown period";
      }
    }

    // Handle cases where payoutMonth might be a string or invalid JSON
    if (typeof payoutMonth === "string") {
      try {
        const parsed = JSON.parse(payoutMonth);
        if (parsed && parsed.start) {
          return format(new Date(parsed.start), "MMMM yyyy");
        }
      } catch {
        return format(new Date(payout.created_at), "MMMM yyyy");
      }
    }

    // Handle object case
    if (typeof payoutMonth === "object" && payoutMonth !== null) {
      if (payoutMonth.start) {
        try {
          return format(new Date(payoutMonth.start), "MMMM yyyy");
        } catch {
          return format(new Date(payout.created_at), "MMMM yyyy");
        }
      }
    }

    // Final fallback to created_at
    try {
      return format(new Date(payout.created_at), "MMMM yyyy");
    } catch {
      return "Unknown period";
    }
  };

  // Custom hook to fetch existing payouts for the selected month
  const { data: existingPayouts, refetch: refetchPayouts } = useQuery({
    queryKey: ["payouts", formatMonthParam(selectedDate)],
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getMonthDateRange(selectedDate);

      const { data, error } = await supabase
        .from("payout")
        .select(
          "id, creator_id, amount, status, created_at, payout_month, name, method, currency"
        )
        .gte("created_at", start)
        .lte("created_at", end);

      if (error) {
        throw new Error(`Failed to fetch payouts: ${error.message}`);
      }

      return data as ExistingPayout[];
    },
  });

  // Mutation for updating payout status
  const updatePayoutMutation = useMutation({
    mutationFn: async ({
      payoutId,
      status,
    }: {
      payoutId: number;
      status: "pending" | "completed";
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("payout")
        .update({ status })
        .eq("id", payoutId);

      if (error) {
        throw new Error(`Failed to update payout: ${error.message}`);
      }

      return { payoutId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      toast({
        title: "Success",
        description: "Payout status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update payout status",
      });
    },
  });

  // Preview payouts for the selected month
  const previewPayouts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo({});

      // Get API key from environment variable or use a temporary one for development
      const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-key";
      const monthParam = formatMonthParam(selectedDate);

      // Prepare manual amounts to send to the API if we have any
      const manualAmountsString =
        Object.keys(manualAmounts).length > 0
          ? `&manual_amounts=${encodeURIComponent(
              JSON.stringify(manualAmounts)
            )}`
          : "";

      // Call the payout generation endpoint with preview flag and exclude_refunds set to true
      const response = await fetch(
        `/api/cron/monthly-payouts?date=${monthParam}&preview=true&exclude_refunds=true&exclude_refunded_orders=true&remove_full_refunds=true&include_real_shopify_data=true&debug=true&detailed_calculation=true${manualAmountsString}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to preview payouts: ${response.statusText}`);
      }

      const data = (await response.json()) as ApiResponse;
      setProcessingResult(data);

      // Store debug information if available
      if (data.debug) {
        console.log("Debug information received:", data.debug);
        setDebugInfo(data.debug);
      } else {
        console.log("No debug information received from API");
        // Clear any existing debug data
        setDebugInfo({});
      }

      // Get creator names and currencies for display if not already included
      if (data.results.length > 0) {
        const supabase = createClient();
        const creatorIds = data.results.map((result) => result.creator_id);

        const { data: creators } = await supabase
          .from("profiles")
          .select("id, name, currency")
          .in("id", creatorIds);

        console.log({ creators });
        if (creators) {
          const namesMap: Record<string, string> = {};
          const currencyMap: Record<string, string> = {};

          creators.forEach((creator) => {
            namesMap[creator.id] = creator.name;
            currencyMap[creator.id] = creator.currency || "GBP"; // Default to GBP if no currency specified
          });

          setCreatorName(namesMap);
          setCreatorCurrency(currencyMap);

          // Initialize manual amounts with the calculated amounts
          const initialAmounts: Record<string, number> = {};
          data.results.forEach((result) => {
            if (result.amount && result.amount > 0) {
              // Use manual amount from API response if available, otherwise use calculated amount
              initialAmounts[result.creator_id] =
                result.manualAmount !== undefined
                  ? result.manualAmount
                  : result.amount;
            }
          });
          setManualAmounts(initialAmounts);
        }
      }

      toast({
        title: "Preview Ready",
        description: `Preview generated for ${formatMonthDisplay(
          selectedDate
        )}`,
      });
    } catch (err) {
      console.error("Error previewing payouts:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to preview payouts. See details below.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate actual payouts
  const generatePayouts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConfirmingGeneration(false);
      setDebugInfo({});

      // Get API key from environment variable or use a temporary one for development
      const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-key";
      const monthParam = formatMonthParam(selectedDate);

      // Prepare manual amounts to send to the API
      const manualAmountsString = encodeURIComponent(
        JSON.stringify(manualAmounts)
      );

      // Call the payout generation endpoint without preview flag
      const response = await fetch(
        `/api/cron/monthly-payouts?date=${monthParam}&exclude_refunds=true&exclude_refunded_orders=true&remove_full_refunds=true&include_real_shopify_data=true&debug=true&detailed_calculation=true&manual_amounts=${manualAmountsString}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate payouts: ${response.statusText}`);
      }

      const data = (await response.json()) as ApiResponse;
      console.log("API Response:", data);

      // Store debug information if available
      if (data.debug) {
        console.log("Debug information:", data.debug);
        setDebugInfo(data.debug);
      }

      // Refresh the list of existing payouts after successful generation
      refetchPayouts();

      toast({
        title: "Success",
        description: `Generated ${
          data.results.length
        } payout records for ${formatMonthDisplay(selectedDate)}`,
      });
    } catch (err) {
      console.error("Error generating payouts:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate payouts. See details below.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating a payout status
  const handleStatusUpdate = async (
    payoutId: number,
    newStatus: "pending" | "completed"
  ) => {
    updatePayoutMutation.mutate({ payoutId, status: newStatus });
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
    setProcessingResult(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
    setProcessingResult(null);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Payout Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Monthly Payouts</CardTitle>
          <CardDescription>
            Preview and generate payouts for a specific month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center justify-between w-[240px]"
                  >
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatMonthDisplay(selectedDate)}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={
                    isSameMonth(selectedDate, new Date()) ||
                    selectedDate > new Date()
                  }
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={previewPayouts}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Preview Payouts"
                )}
              </Button>

              {processingResult && !existingPayouts?.length && (
                <Button
                  onClick={() => setConfirmingGeneration(true)}
                  disabled={isLoading || confirmingGeneration}
                  variant="default"
                >
                  Generate Payouts
                </Button>
              )}

              {confirmingGeneration && (
                <div className="flex space-x-2">
                  <Button
                    onClick={generatePayouts}
                    disabled={isLoading}
                    variant="destructive"
                  >
                    Confirm Generation
                  </Button>
                  <Button
                    onClick={() => setConfirmingGeneration(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Select a month, preview the payouts, and then generate them. Only
              creators with earnings above £20 will receive a payout.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Show any existing payouts for this month */}
      {existingPayouts && existingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Existing Payouts for {formatMonthDisplay(selectedDate)}
            </CardTitle>
            <CardDescription>
              These payouts have already been generated for this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{payout.name || payout.creator_id}</TableCell>
                    <TableCell>
                      {formatCurrency(payout.amount, payout.currency || "GBP")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payout.currency || "GBP"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.status === "completed" ? (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payout.created_at)}</TableCell>
                    <TableCell>{formatPayoutMonth(payout)}</TableCell>
                    <TableCell>
                      {payout.method ? (
                        <Badge variant="outline" className="capitalize">
                          {payout.method}
                        </Badge>
                      ) : (
                        "Not specified"
                      )}
                    </TableCell>
                    <TableCell>
                      {payout.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center"
                          onClick={() =>
                            handleStatusUpdate(payout.id, "completed")
                          }
                          disabled={updatePayoutMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Completed
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center"
                          onClick={() =>
                            handleStatusUpdate(payout.id, "pending")
                          }
                          disabled={updatePayoutMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Mark Pending
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Preview results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {existingPayouts?.length
                ? "Preview Results (Already Generated)"
                : "Preview Results"}
            </CardTitle>
            <CardDescription>
              Period: {formatDate(processingResult.period.start)} to{" "}
              {formatDate(processingResult.period.end)}
              {!existingPayouts?.length && (
                <span className="block mt-1 text-amber-600">
                  You can enter manual amounts that will be saved in the
                  creator's currency.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Calculated Amount (GBP)</TableHead>
                  <TableHead>Creator's Currency</TableHead>
                  {!existingPayouts?.length && (
                    <TableHead>Manual Amount (Will Be Stored)</TableHead>
                  )}
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingResult.results.length > 0 ? (
                  processingResult.results.map((result, index) => {
                    const creatorCurrencyValue =
                      creatorCurrency[result.creator_id];
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {result.creator_name ||
                            creatorName[result.creator_id] ||
                            result.creator_id}
                        </TableCell>
                        <TableCell>
                          {result.amount && result.amount > 0
                            ? formatCurrency(result.amount, "GBP")
                            : "No payout"}
                        </TableCell>
                        <TableCell>{creatorCurrencyValue || "GBP"}</TableCell>
                        {!existingPayouts?.length && (
                          <TableCell>
                            {result.amount && result.amount > 0 ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    className="w-24 p-2 border rounded"
                                    value={
                                      manualAmounts[result.creator_id] || ""
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      setManualAmounts((prev) => ({
                                        ...prev,
                                        [result.creator_id]: isNaN(value)
                                          ? 0
                                          : value,
                                      }));
                                    }}
                                    min="0"
                                    step="0.01"
                                  />
                                  <span>{creatorCurrencyValue || "GBP"}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Will be saved in{" "}
                                  {creatorCurrencyValue || "GBP"}
                                </span>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {result.amount && result.amount > 0
                            ? result.success
                              ? existingPayouts?.length
                                ? "Already generated"
                                : "Ready to generate"
                              : result.error || "Unknown error"
                            : result.message || "No earnings above threshold"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No payouts were found for this period. Creators may not
                      have sufficient earnings.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {!existingPayouts?.length &&
            processingResult.results.some((r) => r.amount && r.amount > 0) && (
              <CardFooter>
                <div className="flex justify-end w-full">
                  <Button
                    onClick={() => setConfirmingGeneration(true)}
                    disabled={isLoading || confirmingGeneration}
                  >
                    Generate Payouts
                  </Button>
                </div>
              </CardFooter>
            )}
        </Card>
      )}

      {/* Debug information section - simple version */}
      {Object.keys(debugInfo).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Real Shopify Order Calculation</CardTitle>
            <CardDescription>
              Exact calculation for {formatMonthDisplay(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.entries(debugInfo).map(
                ([creatorId, data]: [string, any]) => (
                  <div key={creatorId} className="border p-4 rounded-md">
                    <h3 className="text-lg font-bold mb-4">
                      Creator: {creatorName[creatorId] || creatorId}
                    </h3>

                    <div className="space-y-1 mb-6">
                      {/* List all orders */}
                      {data.allOrders && data.allOrders.length > 0 ? (
                        <>
                          <h4 className="font-medium mb-2">
                            Orders in {formatMonthDisplay(selectedDate)}:
                          </h4>
                          {data.allOrders.map((order: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex justify-between p-2 ${
                                order.refunded ? "bg-red-50" : ""
                              }`}
                            >
                              <div>
                                <span className="font-medium">
                                  {order.orderName}
                                </span>{" "}
                                ({formatDate(order.date)}) -{" "}
                                {order.productTitle}
                                {order.refunded && (
                                  <span className="text-red-600 ml-2">
                                    REFUNDED
                                  </span>
                                )}
                              </div>
                              <div>
                                {order.refunded ? (
                                  <span className="text-red-600">
                                    -{formatCurrency(order.amount, "GBP")}
                                  </span>
                                ) : (
                                  formatCurrency(order.amount, "GBP")
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          No orders found for this period
                        </p>
                      )}

                      {/* If allOrders not available, try to combine included and excluded */}
                      {!data.allOrders && data.includedOrders && (
                        <>
                          <h4 className="font-medium mb-2">Included Orders:</h4>
                          {data.includedOrders.map(
                            (order: any, idx: number) => (
                              <div
                                key={`included-${idx}`}
                                className="flex justify-between p-2"
                              >
                                <div>
                                  <span className="font-medium">
                                    {order.orderName || order.orderId}
                                  </span>{" "}
                                  ({formatDate(order.date)}) -{" "}
                                  {order.productTitle}
                                </div>
                                <div>
                                  {formatCurrency(order.amount || 0, "GBP")}
                                </div>
                              </div>
                            )
                          )}
                        </>
                      )}

                      {!data.allOrders &&
                        data.excludedOrders &&
                        data.excludedOrders.length > 0 && (
                          <>
                            <h4 className="font-medium text-red-600 mt-4 mb-2">
                              Excluded/Refunded Orders:
                            </h4>
                            {data.excludedOrders.map(
                              (order: any, idx: number) => (
                                <div
                                  key={`excluded-${idx}`}
                                  className="flex justify-between p-2 bg-red-50"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {order.orderName || order.orderId}
                                    </span>{" "}
                                    ({formatDate(order.date)}) -{" "}
                                    {order.productTitle}
                                    <span className="text-red-600 ml-2">
                                      REFUNDED
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-red-600">
                                      -
                                      {formatCurrency(
                                        order.originalAmount ||
                                          order.amount ||
                                          0,
                                        "GBP"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </>
                        )}
                    </div>

                    {/* Total calculation */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between font-bold">
                        <span>Total Non-Refunded Revenue:</span>
                        <span>
                          {formatCurrency(data.totalRevenue || 0, "GBP")}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>Creator Commission (30%):</span>
                        <span>
                          {formatCurrency(
                            (data.totalRevenue || 0) * 0.3,
                            "GBP"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 mt-4 bg-blue-50 text-blue-700 rounded-md text-sm">
                      <div className="font-medium mb-1">Debug Information:</div>
                      <div className="text-xs space-y-1">
                        <div>
                          Payout System Revenue:{" "}
                          {formatCurrency(data.totalRevenue || 0, "GBP")}
                        </div>
                        <div>
                          Payout System Commission:{" "}
                          {formatCurrency(
                            (data.totalRevenue || 0) * 0.3,
                            "GBP"
                          )}
                        </div>
                        {data.includedOrders && (
                          <div>
                            Orders Included: {data.includedOrders.length}
                            {data.includedOrders.map(
                              (order: any, idx: number) => (
                                <div key={idx} className="ml-2">
                                  • {order.orderName}:{" "}
                                  {formatCurrency(order.amount || 0, "GBP")}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {data.excludedOrders &&
                          data.excludedOrders.length > 0 && (
                            <div>
                              Orders Excluded: {data.excludedOrders.length}
                              {data.excludedOrders.map(
                                (order: any, idx: number) => (
                                  <div key={idx} className="ml-2">
                                    • {order.orderName}:{" "}
                                    {formatCurrency(
                                      order.originalAmount || order.amount || 0,
                                      "GBP"
                                    )}{" "}
                                    (Refunded)
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="p-2 mt-4 bg-red-50 text-red-700 rounded-md text-sm">
                      Note: All refunded orders are completely excluded from
                      revenue calculations.
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
