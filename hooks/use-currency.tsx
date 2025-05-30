"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  SupportedCurrency,
  convertCurrency,
  formatCurrency,
} from "@/lib/currency";
import { useQueryClientContext } from "@/components/query-provider";
import { eventBus, APP_EVENTS } from "@/lib/events";

export function useCurrency() {
  const [userCurrency, setUserCurrency] = useState<SupportedCurrency>("GBP");
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const supabase = createClient();

  // Try first with react-query's useQueryClient
  let queryClient = useQueryClientContext();

  // If the context-based approach doesn't work, try the hook-based approach
  if (!queryClient) {
    try {
      queryClient = useQueryClient();
    } catch (error) {
      // Both approaches failed, we'll just use local state and localStorage
      console.warn(
        "No QueryClient available. Using localStorage for currency preferences."
      );
    }
  }

  // Fetch the user currency directly without useQuery
  useEffect(() => {
    const fetchUserCurrency = async () => {
      setIsLoading(true);

      try {
        // Check for localStorage first
        if (typeof window !== "undefined") {
          const savedCurrency = localStorage.getItem("userCurrency");
          if (
            savedCurrency &&
            ["GBP", "EUR", "USD", "DKK"].includes(savedCurrency)
          ) {
            setUserCurrency(savedCurrency as SupportedCurrency);
          }
        }

        // Then try to get from database
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("currency")
            .eq("id", user.id)
            .single();

          if (!error && profile && profile.currency) {
            setUserCurrency(profile.currency as SupportedCurrency);
            // Update localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("userCurrency", profile.currency);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user currency:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCurrency();
  }, []);

  // Update user currency preference
  const updateUserCurrency = async (newCurrency: SupportedCurrency) => {
    try {
      if (newCurrency === userCurrency) {
        return true; // No change needed
      }

      // Important: Don't set loading to true during currency updates
      // This causes the UI to show skeletons unnecessarily

      // Always update localStorage for better UX
      if (typeof window !== "undefined") {
        localStorage.setItem("userCurrency", newCurrency);
      }

      // Update local state immediately for responsive UI
      setUserCurrency(newCurrency);
      setVersion((prev) => prev + 1); // Increment version to force re-renders

      // Emit global event for real-time updates across components
      // Only emit the event if the currency has actually changed
      // This is to prevent circular event emissions
      if (newCurrency !== userCurrency) {
        eventBus.emit(APP_EVENTS.CURRENCY_CHANGED, newCurrency);
      }

      // The following is the "slower" part - database updates
      // But the UI is already updated by this point

      // Get current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // For non-authenticated users, we just keep it in localStorage
        return true;
      }

      // Update user profile
      const { error } = await supabase
        .from("profiles")
        .update({ currency: newCurrency })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Don't invalidate all queries - we only want to update currency display
      // Specific currency-related queries can be invalidated
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ["userCurrency"] });
        // No need to invalidate or refetch everything
        // queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
        // queryClient.refetchQueries({ queryKey: ["dashboard"] });
      }

      return true;
    } catch (error) {
      console.error("Error updating user currency:", error);
      return false;
    }
  };

  // Helper for currency conversion - memoized with current currency
  const convert = useCallback(
    async (
      amount: number,
      fromCurrency: SupportedCurrency = "GBP"
    ): Promise<number> => {
      return await convertCurrency(amount, fromCurrency, userCurrency);
    },
    [userCurrency]
  );

  // Helper for formatting currency - memoized with current currency
  const format = useCallback(
    (amount: number): string => {
      return formatCurrency(amount, userCurrency);
    },
    [userCurrency]
  );

  return {
    userCurrency,
    setUserCurrency: updateUserCurrency,
    isLoading,
    convert,
    format,
    version, // Expose version for force re-renders
  };
}
