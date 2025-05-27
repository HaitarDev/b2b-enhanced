"use client";
import React, { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { format, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

// Define UI status types
type PayoutStatus = "not_paid" | "paid";

// Define our data interface for the UI
interface CreatorPayout {
  id: number;
  creator: string;
  creator_id: string;
  month: string;
  sales: number;
  revenue: number;
  payout: number;
  status: PayoutStatus;
  currency?: string;
}

const SalesReports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PayoutStatus | null>(
    null
  );
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

  // Fetch payouts data
  const { data: payoutsData, isLoading: isLoadingPayouts } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      try {
        // Get all payouts with creator names
        const { data: payouts, error } = await supabase
          .from("payout")
          .select(
            `
            id, 
            amount, 
            status, 
            created_at, 
            payout_month,
            creator_id,
            currency,
            profiles(id, name)
          `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Get sales data
        const { data: productSales, error: productError } = await supabase
          .from("posters")
          .select("creator_id, sales");

        if (productError) throw productError;

        // Format data for our UI
        const formattedPayouts: CreatorPayout[] = [];

        for (const payout of payouts) {
          // Calculate total sales for this creator
          const creatorProducts = productSales.filter(
            (product) => product.creator_id === payout.creator_id
          );
          const totalSales = creatorProducts.reduce(
            (sum, product) => sum + (product.sales || 0),
            0
          );

          // Format the month from payout_month or created_at
          let monthName = "Unknown";
          if (
            payout.payout_month &&
            typeof payout.payout_month === "object" &&
            payout.payout_month.start
          ) {
            try {
              monthName = format(
                parseISO(payout.payout_month.start),
                "MMMM yyyy"
              );
            } catch (e) {
              console.error("Error parsing date:", e);
            }
          } else if (payout.created_at) {
            try {
              monthName = format(parseISO(payout.created_at), "MMMM yyyy");
            } catch (e) {
              console.error("Error parsing date:", e);
            }
          }

          // Get creator name
          let creatorName = "Unknown Creator";
          if (
            payout.profiles &&
            Array.isArray(payout.profiles) &&
            payout.profiles.length > 0
          ) {
            creatorName =
              (payout.profiles[0].name as string) ||
              `Creator (${payout.creator_id.substring(0, 6)})`;
          } else if (
            payout.profiles &&
            typeof payout.profiles === "object" &&
            "name" in payout.profiles
          ) {
            creatorName = payout.profiles.name as string;
          } else {
            creatorName = `Creator (${payout.creator_id.substring(0, 6)})`;
          }

          // Map DB status to UI status
          const uiStatus: PayoutStatus =
            payout.status === "completed" ? "paid" : "not_paid";

          // Calculate revenue (payout is 30% of revenue)
          const payoutAmount = payout.amount || 0;
          const revenue = payoutAmount / 0.3;

          formattedPayouts.push({
            id: payout.id,
            creator: creatorName,
            creator_id: payout.creator_id,
            month: monthName,
            sales: totalSales,
            revenue: revenue,
            payout: payoutAmount,
            status: uiStatus,
            currency: payout.currency || "USD",
          });
        }

        return formattedPayouts;
      } catch (error) {
        console.error("Error fetching payouts:", error);
        toast({
          title: "Error",
          description: "Failed to load payout data",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Create mutation to update payout status
  const updatePayoutMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: PayoutStatus;
    }) => {
      // Convert UI status to DB status
      const dbStatus = status === "paid" ? "completed" : "pending";

      const { error } = await supabase
        .from("payout")
        .update({ status: dbStatus })
        .eq("id", id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      toast({
        title: "Status Updated",
        description: `Payout status has been updated to ${variables.status.replace(
          "_",
          " "
        )}`,
      });
    },
    onError: (error) => {
      console.error("Error updating payout:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update payout status",
        variant: "destructive",
      });
    },
  });

  // Handle status change for a payout
  const handleStatusChange = (payoutId: number, newStatus: PayoutStatus) => {
    updatePayoutMutation.mutate({ id: payoutId, status: newStatus });
  };

  // Filter payouts based on selected filters
  const filteredPayouts = useMemo(() => {
    if (!payoutsData) return [];

    return payoutsData.filter(
      (payout) =>
        (!selectedMonth || payout.month === selectedMonth) &&
        (!selectedStatus || payout.status === selectedStatus) &&
        (!selectedCreator || payout.creator === selectedCreator)
    );
  }, [payoutsData, selectedMonth, selectedStatus, selectedCreator]);

  // Calculate total unpaid amount
  const getTotalUnpaidAmount = () => {
    return filteredPayouts
      .filter((payout) => payout.status === "not_paid")
      .reduce((sum, payout) => sum + payout.payout, 0);
  };

  // Get unique months for filter
  const getUniqueMonths = () => {
    if (!payoutsData) return [];
    return [...new Set(payoutsData.map((payout) => payout.month))];
  };

  // Get unique creators for filter
  const getUniqueCreators = () => {
    if (!payoutsData) return [];
    return [...new Set(payoutsData.map((payout) => payout.creator))];
  };

  // Get status icon based on status
  const getStatusIcon = (status: PayoutStatus) => {
    switch (status) {
      case "paid":
        return <Check className="h-4 w-4" />;
      case "not_paid":
        return <X className="h-4 w-4" />;
    }
  };

  // Get badge styles based on status
  const getStatusBadgeStyles = (status: PayoutStatus) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-100 border-green-300";
      case "not_paid":
        return "bg-red-100 text-red-800 hover:bg-red-100 border-red-300";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Reports</h1>
        <p className="text-gray-500 mt-1">
          Track sales performance and calculate payouts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap space-x-4 gap-y-2 mb-4">
        <Select
          value={selectedMonth || ""}
          onValueChange={(value) => setSelectedMonth(value || null)}
          disabled={isLoadingPayouts}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            {getUniqueMonths().map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedStatus || ""}
          onValueChange={(value) =>
            setSelectedStatus(value as PayoutStatus | null)
          }
          disabled={isLoadingPayouts}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payout Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_paid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedCreator || ""}
          onValueChange={(value) => setSelectedCreator(value || null)}
          disabled={isLoadingPayouts}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Creator" />
          </SelectTrigger>
          <SelectContent>
            {getUniqueCreators().map((creator) => (
              <SelectItem key={creator} value={creator}>
                {creator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset filters button */}
        {(selectedMonth || selectedStatus || selectedCreator) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedMonth(null);
              setSelectedStatus(null);
              setSelectedCreator(null);
            }}
            className="ml-2"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Summary</CardTitle>
          <CardDescription>
            Total unpaid amount across filtered creators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayouts ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(getTotalUnpaidAmount())}
              </div>
              <p className="text-sm text-gray-500 mt-1">Pending payouts</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Payouts</CardTitle>
          <CardDescription>Monthly payout tracking by creator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Payout Amount (30%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayouts ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading payout data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPayouts.length > 0 ? (
                  filteredPayouts.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.creator}
                      </TableCell>
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.currency || "USD"}</TableCell>
                      <TableCell>{formatCurrency(row.payout)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeStyles(row.status)}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(row.status)}
                            {row.status === "not_paid" ? "Unpaid" : "Paid"}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {row.status === "not_paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(row.id, "paid")}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              disabled={updatePayoutMutation.isPending}
                            >
                              {updatePayoutMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Mark Paid
                            </Button>
                          )}
                          {row.status === "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(row.id, "not_paid")
                              }
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              disabled={updatePayoutMutation.isPending}
                            >
                              {updatePayoutMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              Mark Unpaid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No payout records found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReports;
