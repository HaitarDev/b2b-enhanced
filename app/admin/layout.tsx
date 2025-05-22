"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Users,
  MessageSquare,
  BarChart,
  LogOut,
  FileImage,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const supabase = createClient();
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: <BarChart className="w-5 h-5" />,
    },
    {
      name: "Creators",
      path: "/admin/creators",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Posters",
      path: "/admin/posters",
      icon: <FileImage className="w-5 h-5" />,
    },
    {
      name: "Support Messages",
      path: "/admin/support",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      name: "Payouts",
      path: "/admin/payouts",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      name: "Sales Reports",
      path: "/admin/sales",
      icon: <BarChart className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-sm"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-center">
              <img
                src="https://cdn.shopify.com/s/files/1/0759/0913/6701/files/b2bdeinspar.svg?v=1744817176"
                alt="DEINSPAR Admin"
                className="h-8 w-auto"
              />
            </div>
            <div className="mt-2 text-center text-sm font-medium text-gray-500">
              Admin Panel
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                item.path === "/admin"
                  ? pathname === item.path // Exact match for dashboard
                  : pathname?.startsWith(`${item.path}`); // Prefix match for other routes
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gray-100 text-artist-primary"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <span
                    className={cn(
                      "mr-3 transition-colors",
                      isActive ? "text-artist-primary" : "text-gray-500"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-artist-primary hover:bg-gray-100 rounded-lg"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "flex-1 transition-all duration-200",
          sidebarOpen ? "lg:ml-64" : ""
        )}
      >
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
