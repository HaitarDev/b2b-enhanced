"use client";

import * as React from "react";
import {
  BookIcon,
  GlobeIcon,
  LogOutIcon,
  MessageSquareIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "./theme-toggle";
import { UserData } from "./nav-user";
import { Skeleton } from "./ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { SupportedCurrency } from "@/lib/currency";

interface UserDropdownProps {
  user: UserData;
  isLoading?: boolean;
}

export function UserDropdown({ user, isLoading = false }: UserDropdownProps) {
  const {
    userCurrency,
    setUserCurrency,
    isLoading: isCurrencyLoading,
  } = useCurrency();
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const handleCurrencyChange = async (value: string) => {
    const success = await setUserCurrency(value as SupportedCurrency);
    if (success) {
      toast.success(`Currency updated to ${value}`);
    } else {
      toast.error("Failed to update currency");
    }
  };

  if (isLoading || isCurrencyLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatar || "/placeholder.svg"}
              alt={user.name}
            />
            <AvatarFallback>
              {user.name ? user.name.charAt(0) : ""}
              {user.name?.split(" ")[1]?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BookIcon className="mr-2 h-4 w-4" />
            <span>Documentation</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquareIcon className="mr-2 h-4 w-4" />
            <span>Feedback</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          Preferences
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2 flex h-4 w-4 items-center justify-center">
                  <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </span>
                <span className="text-sm">Theme</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <GlobeIcon className="mr-2 h-4 w-4" />
                <span className="text-sm">Currency</span>
              </div>
              <Select value={userCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="h-7 w-20 rounded-full border-muted bg-muted/30 px-2.5 py-0 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
