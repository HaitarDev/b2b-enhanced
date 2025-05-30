"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export type PayoutMethod = "paypal" | "iban";

export type PayoutHistory = {
  id: number;
  date: Date;
  period: string;
  amount: number;
  method: PayoutMethod;
  status: "pending" | "completed";
  currency: string;
  payout_month: {
    start: string;
    end: string;
  };
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  payment_method: PayoutMethod | null;
  paypal_email: string | null;
  iban: string | null;
  currency: string | null;
};

export type PayoutMethodData = {
  method: PayoutMethod;
  paypalEmail?: string;
  iban?: string;
};

export const usePayouts = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch user profile with payout method info
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, payment_method, paypal_email, iban, currency")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        throw error;
      }

      return data;
    },
  });

  // Fetch payout history
  const { data: payoutHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["payout-history"],
    queryFn: async (): Promise<PayoutHistory[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await supabase
        .from("payout")
        .select(
          "id, amount, status, created_at, payout_month, method, currency"
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payout history:", error);
        throw error;
      }

      return data.map((payout) => ({
        id: payout.id,
        date: new Date(payout.created_at),
        period: formatPayoutPeriod(payout.payout_month),
        amount: payout.amount || 0,
        method: payout.method as PayoutMethod,
        status: payout.status as "pending" | "completed",
        currency: payout.currency || "GBP",
        payout_month: payout.payout_month || { start: "", end: "" },
      }));
    },
  });

  // Update payout method mutation
  const updatePayoutMethodMutation = useMutation({
    mutationFn: async (data: PayoutMethodData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const updateData: any = {
        payment_method: data.method,
        updated_at: new Date().toISOString(),
      };

      if (data.method === "paypal" && data.paypalEmail) {
        updateData.paypal_email = data.paypalEmail;
        // Clear IBAN data when switching to PayPal
        updateData.iban = null;
      } else if (data.method === "iban" && data.iban) {
        updateData.iban = data.iban;
        // Clear PayPal data when switching to IBAN
        updateData.paypal_email = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Payout method saved successfully");
    },
    onError: (error) => {
      console.error("Error updating payout method:", error);
      toast.error("Failed to save payout method");
    },
  });

  // Delete payout method mutation
  const deletePayoutMethodMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          payment_method: null,
          paypal_email: null,
          iban: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Payout method removed successfully");
    },
    onError: (error) => {
      console.error("Error deleting payout method:", error);
      toast.error("Failed to remove payout method");
    },
  });

  return {
    userProfile,
    payoutHistory,
    isLoadingProfile,
    isLoadingHistory,
    updatePayoutMethod: updatePayoutMethodMutation.mutate,
    deletePayoutMethod: deletePayoutMethodMutation.mutate,
    isUpdating: updatePayoutMethodMutation.isPending,
    isDeleting: deletePayoutMethodMutation.isPending,
  };
};

// Helper function to format payout period
const formatPayoutPeriod = (payoutMonth: any): string => {
  if (!payoutMonth) return "Unknown period";

  try {
    if (typeof payoutMonth === "string") {
      const parsed = JSON.parse(payoutMonth);
      if (parsed && parsed.start) {
        return new Date(parsed.start).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
    } else if (typeof payoutMonth === "object" && payoutMonth.start) {
      return new Date(payoutMonth.start).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  } catch (error) {
    console.error("Error parsing payout month:", error);
  }

  return "Unknown period";
};
