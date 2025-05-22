"use client";

import type * as React from "react";
import {
  BarChart3Icon,
  CreditCardIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  PackageIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser, UserData } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// Navigation items
const navMainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "My Products", url: "/dashboard/products", icon: ListIcon },
  { title: "Orders", url: "/dashboard/orders", icon: PackageIcon },
  { title: "Upload", url: "/dashboard/upload", icon: UploadIcon },
  { title: "Earnings", url: "/dashboard/earnings", icon: BarChart3Icon },
  { title: "Payouts", url: "/dashboard/payouts", icon: CreditCardIcon },
];

const navSecondaryItems = [
  { title: "Settings", url: "/dashboard/settings", icon: SettingsIcon },
  { title: "Support", url: "#", icon: HelpCircleIcon },
];

// Fallback user data
const fallbackUser: UserData = {
  name: "User",
  email: "user@example.com",
  avatar: "/placeholder.svg",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userData, setUserData] = useState<UserData>(fallbackUser);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

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
    <Sidebar collapsible="offcanvas" {...props}>
      {/* User information moved to the top */}
      <SidebarHeader className="py-4">
        <NavUser user={userData} isLoading={isLoading} />
        <Separator className="mt-2 bg-sidebar-border/50" />{" "}
        {/* Light separator line */}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary
          items={navSecondaryItems}
          userData={userData}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <Separator className="mb-2 bg-border/30" />{" "}
        {/* Subtle grey horizontal line */}
        <p className="text-xs text-muted-foreground">v2.3.1</p>
      </SidebarFooter>
    </Sidebar>
  );
}
