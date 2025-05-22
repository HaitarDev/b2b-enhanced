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
  error?: string;
  message?: string;
  currency?: string;
}

interface ApiResponse {
  message: string;
  period: {
    start: string;
    end: string;
  };
  results: PayoutResult[];
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
  const [confirmingGeneration, setConfirmingGeneration] = useState(false);
  const queryClient = useQueryClient();

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
          "id, creator_id, amount, status, created_at, payout_month, name, method"
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

      // Get API key from environment variable or use a temporary one for development
      const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-key";
      const monthParam = formatMonthParam(selectedDate);

      // Call the payout generation endpoint with preview flag
      const response = await fetch(
        `/api/cron/monthly-payouts?date=${monthParam}&preview=true`,
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

      // Get creator names for display if not already included
      if (data.results.length > 0 && !data.results[0].creator_name) {
        const supabase = createClient();
        const creatorIds = data.results.map((result) => result.creator_id);

        const { data: creators } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", creatorIds);

        if (creators) {
          const namesMap: Record<string, string> = {};
          creators.forEach((creator) => {
            namesMap[creator.id] = creator.name;
          });
          setCreatorName(namesMap);
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

      // Get API key from environment variable or use a temporary one for development
      const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-key";
      const monthParam = formatMonthParam(selectedDate);

      // First, get all the creator profiles to check their payment methods
      const supabase = createClient();
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, payment_method");

      console.log({ profiles });

      if (profilesError) {
        throw new Error(
          `Failed to fetch creator profiles: ${profilesError.message}`
        );
      }

      // Create a map of creator IDs to payment methods
      const paymentMethodMap: Record<string, string> = {};
      profiles.forEach((profile) => {
        if (profile.id && profile.payment_method) {
          paymentMethodMap[profile.id] = profile.payment_method;
        }
      });

      // Call the payout generation endpoint without preview flag
      const response = await fetch(
        `/api/cron/monthly-payouts?date=${monthParam}`,
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

      // After generating payouts, we need to find the ones that were just created
      // Fetch the payouts that were just created for this month
      const { start, end } = getMonthDateRange(selectedDate);

      // Short delay to ensure database consistency
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: newPayouts, error: fetchError } = await supabase
        .from("payout")
        .select("id, creator_id, amount")
        .gte("created_at", start)
        .lte("created_at", end);

      if (fetchError) {
        throw new Error(
          `Failed to fetch created payouts: ${fetchError.message}`
        );
      }

      console.log("Newly created payouts:", newPayouts);

      // Update each new payout with the corresponding payment method and period
      if (newPayouts && newPayouts.length > 0) {
        for (const payout of newPayouts) {
          const creatorId = payout.creator_id;
          const creatorMethod = paymentMethodMap[creatorId] || "iban"; // Default to IBAN if not set

          console.log(
            `Updating payout ${payout.id} for creator ${creatorId} with method ${creatorMethod}`
          );

          const { error: updateError } = await supabase
            .from("payout")
            .update({
              method: creatorMethod,
              payout_month: {
                start: data.period.start,
                end: data.period.end,
              },
            })
            .eq("id", payout.id);

          if (updateError) {
            console.error(`Failed to update payout ${payout.id}:`, updateError);
          }
        }
      }

      setProcessingResult(data);

      // Refresh the list of existing payouts
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
                    <TableCell>{formatCurrency(payout.amount)}</TableCell>
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
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingResult.results.length > 0 ? (
                  processingResult.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.creator_name ||
                          creatorName[result.creator_id] ||
                          result.creator_id}
                      </TableCell>
                      <TableCell>
                        {result.amount && result.amount > 0
                          ? formatCurrency(result.amount)
                          : "No payout"}
                      </TableCell>
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
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
    </div>
  );
}
