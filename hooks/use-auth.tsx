"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: "creator" | "admin";
  approved?: boolean;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const supabase = createClient();

  useEffect(() => {
    const getAuthState = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
          return;
        }

        // Get user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url, role, approved")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setAuthState({
            user,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }

        setAuthState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error("Error getting auth state:", error);
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    getAuthState();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        getAuthState();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return authState;
}
