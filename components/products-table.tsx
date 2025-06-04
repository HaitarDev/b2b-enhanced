"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ExternalLinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Helper function to get badge styling based on status
const getStatusBadgeStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
      return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50 dark:bg-green-950 dark:text-green-300 dark:border-green-800";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200 hover:bg-red-50 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
    case "pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800";
    case "processing":
    case "processed":
      return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
    case "will be deleted":
      return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
    case "deleted":
      return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800";
  }
};

export function ProductsTable() {
  const { data, isLoading } = useDashboardData();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 3;

  // Debug logging
  console.log("ProductsTable component data:", {
    data,
    isLoading,
    hasProducts: !!data?.products,
    productsCount: data?.products?.length,
    products: data?.products,
    stats: data?.stats,
  });

  // Only show approved products and sort them in descending order (most recent first)
  // Then take only the first 3 products
  const approvedProducts =
    data?.products
      ?.filter((product) => {
        console.log("Product filter check:", {
          id: product.id,
          title: product.title,
          status: product.status,
          salesCount: product.salesCount,
          revenue: product.revenue,
          commission: product.commission,
        });
        return product.status === "approved";
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 3) || []; // Take only the first 3 most recent products

  console.log("Approved products processed:", {
    count: approvedProducts.length,
    products: approvedProducts,
  });

  // Since we're only showing 3 products, we don't need pagination
  const paginatedProducts = approvedProducts;
  const totalPages = 1; // Always 1 page since we're showing max 3 products

  const handlePrevious = () => {
    setPage((p) => Math.max(p - 1, 1));
  };

  const handleNext = () => {
    setPage((p) => Math.min(p + 1, totalPages));
  };

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Your Products</CardTitle>
        <CardDescription>Your 3 most recently added products</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[80px]">Shop Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No approved products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {product.title}
                              </span>
                              {product.variantTitle && (
                                <span className="text-xs text-muted-foreground">
                                  {product.variantTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeStyle(product.status)}
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.salesCount || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          £{(product.revenue || 0).toFixed(2)}
                          {product.salesCount === 0 && (
                            <span className="text-xs text-muted-foreground block">
                              No sales yet
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          £{(product.commission || 0).toFixed(2)}
                          {product.salesCount === 0 && (
                            <span className="text-xs text-muted-foreground block">
                              No commission yet
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(product.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {product.shopifyUrl ? (
                            <a
                              href={product.shopifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <ExternalLinkIcon className="size-4" />
                                <span className="sr-only">View in shop</span>
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not available
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/products")}
          className="flex items-center gap-1"
        >
          Show All
          <ExternalLinkIcon className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
