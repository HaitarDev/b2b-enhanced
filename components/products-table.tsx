"use client";

import { useState } from "react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ExternalLinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ProductsTable() {
  const { data, isLoading } = useDashboardData();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Only show approved products
  const approvedProducts =
    data?.products.filter((product) => product.status === "approved") || [];

  const paginatedProducts = approvedProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalPages = Math.ceil(approvedProducts.length / pageSize);

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
        <CardDescription>
          View and manage your products in the shop
        </CardDescription>
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
                        No products found.
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
                            variant={
                              product.status === "approved"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.salesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          £{product.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          £{product.commission.toFixed(2)}
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
            {approvedProducts.length > pageSize && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
