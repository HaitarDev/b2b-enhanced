"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserDropdown } from "./user-dropdown";
import { useTheme } from "next-themes";
import { UserData } from "./nav-user";

// Fallback user data
const fallbackUser: UserData = {
  name: "User",
  email: "user@example.com",
  avatar: "/placeholder.svg",
};

export function SiteHeaderDashboard() {
  const [userData, setUserData] = useState<UserData>(fallbackUser);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsLoading(true);

        // Get current authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          console.error("Error fetching user profile:", error);
          setIsLoading(false);
          return;
        }

        // Update user data
        setUserData({
          id: profile.id,
          name: profile.name || fallbackUser.name,
          email: profile.email || fallbackUser.email,
          avatar: profile.avatar_url || fallbackUser.avatar,
        });
      } catch (error) {
        console.error("Error in fetchUserData:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <SidebarTrigger className="-ml-1" />
            {/* Logo that changes based on theme */}
            <img
              src={
                resolvedTheme === "dark"
                  ? "/images/logo-white.svg"
                  : "/images/deinspar-logo.svg"
              }
              alt="DEINSPAR"
              className="h-4 ml-2"
            />
          </div>
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
          />
        </div>

        {/* User dropdown with real user data */}
        <UserDropdown user={userData} isLoading={isLoading} />
      </div>
    </header>
  );
}
