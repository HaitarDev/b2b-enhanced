"use client";

import Link from "next/link";
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SupportModal } from "./support-modal";
import { CommandSearch } from "./command-search";
import { QueryProvider } from "./query-provider";

export function NavSecondary({
  items,
  userData,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
  userData: {
    name: string;
    email: string;
    id?: string;
  };
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [supportModalOpen, setSupportModalOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.title === "Support" ? (
                  <SidebarMenuButton onClick={() => setSupportModalOpen(true)}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}

            {/* Custom Search Button */}
            <SidebarMenuItem>
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground rounded-md border border-input bg-background hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center">
                  <Search className="mr-2 h-4 w-4" />
                  <span>Search documentation...</span>
                </div>
                <kbd className="pointer-events-none flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <QueryProvider>
        <SupportModal
          open={supportModalOpen}
          onOpenChange={setSupportModalOpen}
          userData={userData}
        />
      </QueryProvider>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
