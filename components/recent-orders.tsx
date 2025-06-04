"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLinkIcon } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function RecentOrders() {
  const { data, isLoading } = useDashboardData();
  const router = useRouter();

  // Debug logging
  console.log("RecentOrders component data:", {
    data,
    isLoading,
    hasOrders: !!data?.orders,
    ordersCount: data?.orders?.length,
    orders: data?.orders,
  });

  // Get the most recent 5 orders and sort them in descending order (most recent first)
  const recentOrders =
    data?.orders
      ?.filter((order) => order && order.id) // Filter out any invalid orders
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5) || [];

  console.log("Recent orders processed:", {
    count: recentOrders.length,
    orders: recentOrders,
  });

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Your most recent orders from the shop
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {data?.orders
                        ? data.orders.length === 0
                          ? "No orders found."
                          : `Found ${data.orders.length} orders but none are valid.`
                        : "No orders data available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.orderNumber || order.id}
                      </TableCell>
                      <TableCell>
                        {order.createdAt
                          ? format(new Date(order.createdAt), "MMM d, yyyy")
                          : "Unknown date"}
                      </TableCell>
                      <TableCell>
                        {order.lineItems?.length || 0}{" "}
                        {(order.lineItems?.length || 0) === 1
                          ? "item"
                          : "items"}
                      </TableCell>
                      <TableCell className="text-right">
                        £{parseFloat(order.totalAmount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {order.financialStatus || "Unknown"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/orders")}
          className="flex items-center gap-1"
        >
          Show All
          <ExternalLinkIcon className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
