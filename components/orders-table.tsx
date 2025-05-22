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
  DateRangeFilter,
  type DateRange,
} from "@/components/date-range-filter";
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

// Update the sample orders data to include more diverse examples
const sampleOrders: Order[] = [
  {
    id: "ORD-7352",
    date: new Date("2024-05-15T14:32:00"),
    status: "Paid",
    total: 84.0,
    customer: "Alex Thompson",
    email: "alex.thompson@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 84.0,
    items: [
      {
        id: "P001",
        name: "Minimalist Abstract Art Poster",
        quantity: 1,
        price: 84.0,
      },
    ],
  },
  {
    id: "ORD-7351",
    date: new Date("2024-05-14T09:21:00"),
    status: "Paid",
    total: 152.0,
    customer: "Sarah Chen",
    email: "sarah.chen@example.com",
    refundAmount: 0,
    shippingAmount: 7.5,
    netRevenue: 152.0,
    items: [
      {
        id: "P002",
        name: "Vintage Travel Poster - Paris",
        quantity: 2,
        price: 76.0,
      },
    ],
  },
  {
    id: "ORD-7350",
    date: new Date("2024-05-13T16:45:00"),
    status: "Refunded",
    total: 54.0,
    customer: "Michael Davis",
    email: "michael.davis@example.com",
    refundAmount: 54.0,
    shippingAmount: 4.99,
    netRevenue: 0,
    items: [
      {
        id: "P003",
        name: "Motivational Quote Poster",
        quantity: 1,
        price: 54.0,
      },
    ],
  },
  {
    id: "ORD-7349",
    date: new Date("2024-05-12T11:17:00"),
    status: "Paid",
    total: 62.0,
    customer: "Emma Wilson",
    email: "emma.wilson@example.com",
    refundAmount: 0,
    shippingAmount: 0,
    netRevenue: 62.0,
    items: [
      { id: "P004", name: "Nature Landscape Poster", quantity: 1, price: 62.0 },
    ],
  },
  {
    id: "ORD-7348",
    date: new Date("2024-05-11T15:30:00"),
    status: "Paid",
    total: 76.0,
    customer: "James Rodriguez",
    email: "james.rodriguez@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 76.0,
    items: [
      {
        id: "P002",
        name: "Vintage Travel Poster - Paris",
        quantity: 1,
        price: 76.0,
      },
    ],
  },
  {
    id: "ORD-7347",
    date: new Date("2024-05-10T10:05:00"),
    status: "Unknown",
    total: 38.0,
    customer: "Olivia Brown",
    email: "olivia.brown@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 38.0,
    items: [
      { id: "P005", name: "Movie Classic Poster", quantity: 1, price: 38.0 },
    ],
  },
  {
    id: "ORD-7346",
    date: new Date("2024-05-09T13:22:00"),
    status: "Paid",
    total: 48.0,
    customer: "Noah Martinez",
    email: "noah.martinez@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 48.0,
    items: [
      {
        id: "P006",
        name: "Geometric Pattern Poster",
        quantity: 1,
        price: 48.0,
      },
    ],
  },
  {
    id: "ORD-7345",
    date: new Date("2024-05-08T17:40:00"),
    status: "Paid",
    total: 30.0,
    customer: "Sophia Lee",
    email: "sophia.lee@example.com",
    refundAmount: 0,
    shippingAmount: 0,
    netRevenue: 30.0,
    items: [
      { id: "P007", name: "Cityscape Night Poster", quantity: 1, price: 30.0 },
    ],
  },
  {
    id: "ORD-7344",
    date: new Date("2024-05-07T08:55:00"),
    status: "Refunded",
    total: 44.0,
    customer: "William Johnson",
    email: "william.johnson@example.com",
    refundAmount: 44.0,
    shippingAmount: 4.99,
    netRevenue: 0,
    items: [
      {
        id: "P008",
        name: "Botanical Illustration Poster",
        quantity: 1,
        price: 44.0,
      },
    ],
  },
  {
    id: "ORD-7343",
    date: new Date("2024-05-06T12:10:00"),
    status: "Paid",
    total: 58.0,
    customer: "Ava Garcia",
    email: "ava.garcia@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 58.0,
    items: [
      {
        id: "P009",
        name: "Space Exploration Poster",
        quantity: 1,
        price: 58.0,
      },
    ],
  },
  {
    id: "ORD-7342",
    date: new Date("2024-05-05T14:25:00"),
    status: "Paid",
    total: 36.0,
    customer: "Ethan Miller",
    email: "ethan.miller@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 36.0,
    items: [
      { id: "P010", name: "Retro Gaming Poster", quantity: 1, price: 36.0 },
    ],
  },
  {
    id: "ORD-7341",
    date: new Date("2024-05-04T09:30:00"),
    status: "Paid",
    total: 52.0,
    customer: "Isabella Taylor",
    email: "isabella.taylor@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 52.0,
    items: [
      { id: "P011", name: "Watercolor Art Poster", quantity: 1, price: 52.0 },
    ],
  },
  {
    id: "ORD-7340",
    date: new Date("2024-05-03T16:15:00"),
    status: "Paid",
    total: 66.0,
    customer: "Mason Anderson",
    email: "mason.anderson@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 66.0,
    items: [
      { id: "P012", name: "Music Festival Poster", quantity: 1, price: 66.0 },
    ],
  },
  {
    id: "ORD-7339",
    date: new Date("2024-05-02T11:45:00"),
    status: "Refunded",
    total: 84.0,
    customer: "Charlotte Thomas",
    email: "charlotte.thomas@example.com",
    refundAmount: 84.0,
    shippingAmount: 4.99,
    netRevenue: 0,
    items: [
      {
        id: "P001",
        name: "Minimalist Abstract Art Poster",
        quantity: 1,
        price: 84.0,
      },
    ],
  },
  {
    id: "ORD-7338",
    date: new Date("2024-05-01T13:50:00"),
    status: "Paid",
    total: 76.0,
    customer: "Liam Jackson",
    email: "liam.jackson@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 76.0,
    items: [
      {
        id: "P002",
        name: "Vintage Travel Poster - Paris",
        quantity: 1,
        price: 76.0,
      },
    ],
  },
  {
    id: "ORD-7337",
    date: new Date("2024-04-30T10:15:00"),
    status: "Paid",
    total: 108.0,
    customer: "Olivia Martinez",
    email: "olivia.martinez@example.com",
    refundAmount: 0,
    shippingAmount: 7.5,
    netRevenue: 108.0,
    items: [
      {
        id: "P001",
        name: "Minimalist Abstract Art Poster",
        quantity: 1,
        price: 84.0,
      },
      { id: "P007", name: "Cityscape Night Poster", quantity: 1, price: 24.0 },
    ],
  },
  {
    id: "ORD-7336",
    date: new Date("2024-04-29T15:40:00"),
    status: "Refunded",
    total: 152.0,
    customer: "Noah Wilson",
    email: "noah.wilson@example.com",
    refundAmount: 152.0,
    shippingAmount: 7.5,
    netRevenue: 0,
    items: [
      {
        id: "P002",
        name: "Vintage Travel Poster - Paris",
        quantity: 2,
        price: 76.0,
      },
    ],
  },
  {
    id: "ORD-7335",
    date: new Date("2024-04-28T09:25:00"),
    status: "Paid",
    total: 138.0,
    customer: "Emma Brown",
    email: "emma.brown@example.com",
    refundAmount: 0,
    shippingAmount: 7.5,
    netRevenue: 138.0,
    items: [
      {
        id: "P003",
        name: "Motivational Quote Poster",
        quantity: 1,
        price: 54.0,
      },
      {
        id: "P008",
        name: "Botanical Illustration Poster",
        quantity: 2,
        price: 42.0,
      },
    ],
  },
  {
    id: "ORD-7334",
    date: new Date("2024-04-27T14:10:00"),
    status: "Unknown",
    total: 62.0,
    customer: "Liam Davis",
    email: "liam.davis@example.com",
    refundAmount: 0,
    shippingAmount: 4.99,
    netRevenue: 62.0,
    items: [
      { id: "P004", name: "Nature Landscape Poster", quantity: 1, price: 62.0 },
    ],
  },
  {
    id: "ORD-7333",
    date: new Date("2024-04-26T11:35:00"),
    status: "Paid",
    total: 228.0,
    customer: "Ava Thompson",
    email: "ava.thompson@example.com",
    refundAmount: 0,
    shippingAmount: 10.0,
    netRevenue: 228.0,
    items: [
      {
        id: "P002",
        name: "Vintage Travel Poster - Paris",
        quantity: 3,
        price: 76.0,
      },
    ],
  },
];

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
    header: "Total",
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("total") as string);
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "refundAmount",
    header: "Refund",
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("refundAmount") as string) || 0;
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      return amount > 0 ? (
        <div className="text-right font-medium text-destructive">
          {formatted}
        </div>
      ) : (
        <div className="text-right text-muted-foreground">None</div>
      );
    },
  },
  {
    accessorKey: "shippingAmount",
    header: "Shipping",
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("shippingAmount") as string) || 0;
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      return amount > 0 ? (
        <div className="text-right font-medium">{formatted}</div>
      ) : (
        <div className="text-right text-muted-foreground">Free</div>
      );
    },
  },
  {
    accessorKey: "netRevenue",
    header: "Net Revenue",
    cell: ({ row }: { row: Row<Order> }) => {
      const amount = parseFloat(row.getValue("netRevenue") as string) || 0;
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }: { row: Row<Order> }) => (
      <div className="flex flex-col">
        <span>{row.getValue("customer")}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<Order> }) => {
      const order = row.original;

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
  isRefreshing?: boolean;
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
  onDateRangeChange?: (range: DateRange) => void;
  onTimeRangeChange?: (timeRange: string) => void;
  currentDateRange?: DateRange;
  currentTimeRange?: string;
  isStandalone?: boolean;
}

export function OrdersTable({
  orders = sampleOrders,
  isLoading = false,
  isRefreshing = false,
  orderStats,
  onDateRangeChange,
  onTimeRangeChange,
  currentDateRange,
  currentTimeRange = "all",
  isStandalone = false,
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

  // Initialize dateRange from props if available
  const [dateRange, setDateRange] = React.useState<DateRange>(
    currentDateRange || {
      from: undefined,
      to: undefined,
    }
  );

  // Update state when props change
  React.useEffect(() => {
    if (currentDateRange) {
      setDateRange(currentDateRange);
    }
  }, [currentDateRange]);

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
          (order.items &&
            order.items.some((item) =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ))
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

  // Handle date range change
  const handleDateRangeChange = React.useCallback(
    (range: DateRange) => {
      setDateRange(range);
      if (onDateRangeChange) {
        onDateRangeChange(range);
      }
    },
    [onDateRangeChange]
  );

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

          <Select
            value={selectedTimeRange}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {/* Only show DateRangeFilter when not in standalone mode or when custom range is selected */}
          {(!isStandalone || selectedTimeRange === "custom") && (
            <React.Suspense fallback={<div>Loading filter...</div>}>
              <DateRangeFilter
                onRangeChange={handleDateRangeChange}
                defaultValues={dateRange}
                currentOption={
                  selectedTimeRange === "custom"
                    ? "custom"
                    : (selectedTimeRange as any)
                }
              />
            </React.Suspense>
          )}
        </div>
      </div>

      {orderStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{orderStats.totalOrders}</div>
          </div>
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
              {new Intl.NumberFormat("en-GB", {
                style: "currency",
                currency: "GBP",
              }).format(orderStats.totalRevenue)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">
              {orderStats.totalRefunds > 0 ? "Net Revenue" : "Average Order"}
            </div>
            <div className="text-2xl font-bold">
              {orderStats.totalRefunds > 0
                ? new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                  }).format(orderStats.netRevenue || orderStats.totalRevenue)
                : new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                  }).format(orderStats.averageOrderValue)}
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
                  (
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                  }).format(orderStats.totalRefunds)}
                  )
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="relative overflow-x-auto">
          {(isLoading || isRefreshing) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <div className="flex items-center gap-2">
                <LoaderIcon className="h-6 w-6 animate-spin" />
                <span>{isLoading ? "Loading..." : "Refreshing..."}</span>
              </div>
            </div>
          )}

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
                    {isLoading || isRefreshing ? (
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
