import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Payout = {
  id: string;
  creator_id: string;
  amount: number; // Stored as a decimal in database
  status: string;
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  creator_name?: string;
  currency?: string;
};

export type ProductVariantData = {
  variantId: string;
  title: string;
  totalSold: number;
  totalRevenue: number;
  currency: string;
  orders: Array<{
    orderId: string;
    orderName: string;
    date: string;
    quantity: number;
    pricePaid: number; // Exact price per unit from the order
    lineTotal: number;
  }>;
};

export type ProductRevenueData = {
  productId: string;
  title: string;
  revenue: number;
  sales: number;
  currency: string;
  variants?: ProductVariantData[];
};

export type PayoutResult = {
  creator_id: string;
  creator_name: string;
  success: boolean;
  error?: string;
  message?: string;
  payout_id?: string;
  amount?: number;
  sales?: number;
  currency?: string;
  products?: ProductRevenueData[];
};

export type PayoutResponse = {
  message: string;
  period: { start: string; end: string };
  results: PayoutResult[];
};

// Fetch all payouts
export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: async (): Promise<Payout[]> => {
      const response = await fetch("/api/payouts");
      if (!response.ok) {
        throw new Error("Failed to fetch payouts");
      }
      return response.json();
    },
  });
}

// Fetch payouts for a specific creator
export function useCreatorPayouts(creatorId: string) {
  return useQuery({
    queryKey: ["payouts", "creator", creatorId],
    queryFn: async (): Promise<Payout[]> => {
      const response = await fetch(`/api/payouts?creatorId=${creatorId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch creator payouts");
      }
      return response.json();
    },
    enabled: !!creatorId,
  });
}

// Generate monthly payouts
export function useGeneratePayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date?: string): Promise<PayoutResponse> => {
      const response = await fetch(
        `/api/cron/monthly-payouts?date=${date || ""}?`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              process.env.NEXT_PUBLIC_CRON_API_KEY || "development"
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate payouts: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate payouts queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

// Update payout status
export function useUpdatePayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payoutId,
      status,
    }: {
      payoutId: string;
      status: string;
    }): Promise<Payout> => {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update payout status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate specific payout query and payouts list
      queryClient.invalidateQueries({
        queryKey: ["payouts", variables.payoutId],
      });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}
