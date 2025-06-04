"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ColumnsIcon,
  LoaderIcon,
  SearchIcon,
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import the utility function for consistent counting
import { countTotalSales } from "@/utils/sales-helpers";

// Import the formatCurrency function from lib/utils
import { formatCurrency } from "@/lib/utils";

import {
  OrdersDateRangePicker,
  type OrdersDateRange,
} from "@/components/orders-date-range-picker";
import { DashboardFilter } from "@/hooks/use-dashboard-data";

// Define the schema for order data
export const orderSchema = z.object({
  id: z.string(),
  date: z.date(),
  status: z.enum(["Paid", "Refunded", "Unknown", "Processing", "Cancelled"]),
  total: z.number(),
  customer: z.string(),
  email: z.string().email().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  refundAmount: z.number().optional().default(0),
  shippingAmount: z.number().optional().default(0),
  netRevenue: z.number().optional().default(0),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    )
    .optional(),
});

export type Order = z.infer<typeof orderSchema>;

// Define the columns for the orders table
const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: "Order",
    cell: ({ row }: { row: Row<Order> }) => (
      <div className="font-medium">#{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }: { row: Row<Order> }) => {
      const date = row.getValue("date") as Date;
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<Order> }) => {
      const status = row.getValue("status") as string;

      return (
        <Badge
          variant={
            status === "Paid"
              ? "success"
              : status === "Processing"
              ? "outline"
              : status === "Refunded"
              ? "secondary"
              : status === "Cancelled"
              ? "destructive"
              : "default"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }: { row: Row<Order> }) => {
      const order = row.original;
      return (
        <div className="flex flex-col justify-end text-right">
          <div className="font-medium">{formatCurrency(order.total)}</div>
          {order.status === "Refunded" && order.refundAmount > 0 && (
            <div className="text-xs text-destructive">
              -{formatCurrency(order.refundAmount)} (Refunded)
            </div>
          )}
          {order.status !== "Refunded" && order.refundAmount > 0 && (
            <div className="text-xs text-destructive">
              -{formatCurrency(order.refundAmount)} (Partial Refund)
            </div>
          )}
          {order.shippingAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(order.shippingAmount)} shipping
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "refundAmount",
    header: () => <div className="text-right">Refund</div>,
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("refundAmount") as string) || 0;

      return amount > 0 ? (
        <div className="text-right font-medium text-destructive">
          {formatCurrency(amount)}
        </div>
      ) : (
        <div className="text-right text-muted-foreground">None</div>
      );
    },
  },
  {
    accessorKey: "shippingAmount",
    header: () => <div className="text-right">Shipping</div>,
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("shippingAmount") as string) || 0;

      return amount > 0 ? (
        <div className="text-right font-medium">{formatCurrency(amount)}</div>
      ) : (
        <div className="text-right text-muted-foreground">Free</div>
      );
    },
  },
  {
    accessorKey: "netRevenue",
    header: () => <div className="text-right">Net Revenue</div>,
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("netRevenue") as string) || 0;

      return (
        <div className="text-right font-medium">{formatCurrency(amount)}</div>
      );
    },
  },
  {
    accessorKey: "items",
    header: "Poster Info",
    cell: ({ row }: { row: Row<Order> }) => {
      const items = row.original.items || [];
      return (
        <div className="flex flex-col">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="flex flex-col">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  Qty: {item.quantity} × {formatCurrency(item.price)}
                </span>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">No items</span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: () => {
      return (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open order details</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      );
    },
  },
];

interface OrdersTableProps {
  orders?: Order[];
  isLoading?: boolean;
  orderStats?: {
    totalOrders: number;
    paidOrdersCount: number;
    refundedOrdersCount: number;
    cancelledOrdersCount: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalRefunds: number;
    netRevenue: number;
    totalSales: number;
  };
  onTimeRangeChange?: (timeRange: string) => void;
  onRangeChange?: (range: OrdersDateRange) => void;
  currentTimeRange?: string;
}

export function OrdersTable({
  orders = [],
  isLoading = false,
  orderStats,
  onTimeRangeChange,
  onRangeChange,
  currentTimeRange = "this_month",
}: OrdersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]); // Default sort by date descending
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] =
    React.useState<string>(currentTimeRange);

  // Update state when props change
  React.useEffect(() => {
    if (currentTimeRange) {
      setSelectedTimeRange(currentTimeRange);
      console.log(`OrdersTable: Time range updated to ${currentTimeRange}`);
    }
  }, [currentTimeRange]);

  // Filter orders based on search query and status
  const filteredOrders = React.useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.email &&
            order.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchQuery, statusFilter]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Handle time range selection
  const handleTimeRangeChange = React.useCallback(
    (value: string) => {
      setSelectedTimeRange(value);
      if (onTimeRangeChange) {
        onTimeRangeChange(value);
      }
    },
    [onTimeRangeChange]
  );

  // Update the calculateTotalSales function to use the utility
  const calculateTotalSales = (orders: Order[]): number => {
    return countTotalSales(orders);
  };

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[250px] pl-8"
            />
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>

          <OrdersDateRangePicker
            currentTimeRange={selectedTimeRange as DashboardFilter}
            onTimeRangeChange={(timeRange) => handleTimeRangeChange(timeRange)}
            onRangeChange={(range) => {
              // Handle custom date range changes
              console.log("Date range changed:", range);
              if (onRangeChange) {
                onRangeChange(range);
              }
            }}
          />
        </div>
      </div>

      {orderStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">
              {orderStats?.totalSales || calculateTotalSales(orders)}
            </div>
            <div className="text-xs text-muted-foreground">Items sold</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">
              {formatCurrency(orderStats.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground">Gross revenue</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Net Revenue</div>
            <div className="text-2xl font-bold">
              {formatCurrency(orderStats.netRevenue)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-muted-foreground">After refunds</span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Paid Orders</div>
            <div className="text-2xl font-bold">
              {orderStats.paidOrdersCount}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Refunds</div>
            <div className="text-2xl font-bold flex items-baseline gap-2">
              <span>{orderStats.refundedOrdersCount}</span>
              {orderStats.totalRefunds > 0 && (
                <span className="text-sm text-destructive">
                  ({formatCurrency(orderStats.totalRefunds)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="relative overflow-x-auto">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <div className="text-sm text-muted-foreground">Refreshing...</div>
            </div>
          )}

          <div className="rounded-md border">
            {isLoading ? (
              <div className="flex h-[400px] w-full items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-medium">Loading orders...</div>
                  <div className="text-sm text-muted-foreground">
                    Please wait while we fetch your order data
                  </div>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span>No orders found in this time period.</span>
                            <span className="text-sm text-muted-foreground">
                              Try selecting a different date range to see more
                              orders.
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {isLoading ? (
              <Skeleton className="h-4 w-[150px]" />
            ) : (
              `Showing ${table.getFilteredRowModel().rows.length} order(s)`
            )}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {isLoading ? (
                <Skeleton className="h-4 w-[100px]" />
              ) : (
                <>
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsLeftIcon className="rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              <ColumnsIcon className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
