"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true once component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if user is authenticated and is an admin
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        throw new Error("Not authenticated");
      }
      return user;
    },
    // Only run this query on the client side
    enabled: isClient,
  });

  // Check admin role
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", currentUser?.id],
    enabled: !!currentUser?.id && isClient,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser?.id)
        .single();

      if (error) throw error;

      if (data.role !== "admin") {
        toast({
          variant: "destructive",
          title: "Access denied",
          description:
            "You don't have permission to access the admin dashboard.",
        });
        router.push("/");
        throw new Error("Not admin");
      }

      return data;
    },
  });

  // Fetch dashboard data
  const {
    data,
    isLoading: queryLoading,
    isError,
  } = useQuery({
    queryKey: ["adminDashboardData"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    enabled: !!profile && profile.role === "admin" && isClient,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (isError) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard data",
        description: "Failed to fetch latest counts. Please try again later.",
      });
    }
    setIsLoading(false);
  }, [isError, toast]);

  const renderCount = (count: number | null) => {
    if (isLoading || profileLoading || queryLoading) {
      return <Skeleton className="h-8 w-16" />;
    }
    return count !== null ? count : "--";
  };

  const renderAmount = (amount: number | null) => {
    if (isLoading || profileLoading || queryLoading) {
      return <Skeleton className="h-8 w-20" />;
    }
    return amount !== null ? formatCurrency(amount) : "--";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Manage your platform, users, and content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Creators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {renderCount(data?.approvedCreatorsCount ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {renderCount(data?.pendingCreatorsCount ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {renderCount(data?.unresolvedTicketsCount ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unresolved tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Successful Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {renderAmount(data?.totalSuccessfulPayouts ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total paid out</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
