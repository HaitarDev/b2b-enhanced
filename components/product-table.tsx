"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
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
  ExternalLinkIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DateRangeFilter,
  type DateRange,
  type DateRangeOption,
} from "@/components/date-range-filter";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define the schema for product data with updated status options
export const productSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  sales: z.number(),
  status: z.enum([
    "Approved",
    "Rejected",
    "Pending",
    "Will be deleted",
    "Deleted",
  ]),
  revenue: z.number(),
  commission: z.number(),
  image: z.string().optional(),
  shopUrl: z.string().optional(),
  shopifyProductId: z.string().nullable().optional(),
});

export type Product = z.infer<typeof productSchema>;

// Updated sample product data with all status types
const sampleProducts: Product[] = [
  {
    id: "P001",
    name: "Minimalist Abstract Art Poster",
    sales: 42,
    status: "Approved",
    revenue: 840.0,
    commission: 252.0,
    image: "/abstract-composition.png",
    shopUrl: "#",
    shopifyProductId: "P001",
  },
  {
    id: "P002",
    name: "Vintage Travel Poster - Paris",
    sales: 38,
    status: "Approved",
    revenue: 760.0,
    commission: 228.0,
    image: "/paris-travel.png",
    shopUrl: "#",
    shopifyProductId: "P002",
  },
  {
    id: "P003",
    name: "Motivational Quote Poster",
    sales: 27,
    status: "Approved",
    revenue: 540.0,
    commission: 162.0,
    image: "/motivational-quote.png",
    shopUrl: "#",
    shopifyProductId: "P003",
  },
  {
    id: null,
    name: "Nature Landscape Poster",
    sales: 31,
    status: "Approved",
    revenue: 620.0,
    commission: 186.0,
    image: "/serene-mountain-lake.png",
    shopUrl: "#",
    shopifyProductId: null,
  },
  {
    id: "P005",
    name: "Movie Classic Poster",
    sales: 19,
    status: "Rejected",
    revenue: 380.0,
    commission: 114.0,
    image: "/classic-movie.png",
    shopUrl: "#",
  },
  {
    id: "P006",
    name: "Geometric Pattern Poster",
    sales: 24,
    status: "Approved",
    revenue: 480.0,
    commission: 144.0,
    image: "/abstract-geometric-pattern.png",
    shopUrl: "#",
  },
  {
    id: "P007",
    name: "Cityscape Night Poster",
    sales: 15,
    status: "Pending",
    revenue: 300.0,
    commission: 90.0,
    image: "/cityscape-night.png",
    shopUrl: "#",
  },
  {
    id: "P008",
    name: "Botanical Illustration Poster",
    sales: 22,
    status: "Approved",
    revenue: 440.0,
    commission: 132.0,
    image: "/botanical-illustration.png",
    shopUrl: "#",
  },
  {
    id: "P009",
    name: "Space Exploration Poster",
    sales: 29,
    status: "Will be deleted",
    revenue: 580.0,
    commission: 174.0,
    image: "/vast-space-exploration.png",
    shopUrl: "#",
  },
  {
    id: "P010",
    name: "Retro Gaming Poster",
    sales: 18,
    status: "Deleted",
    revenue: 360.0,
    commission: 108.0,
    image: "/retro-gaming-setup.png",
    shopUrl: "#",
  },
  {
    id: "P011",
    name: "Watercolor Art Poster",
    sales: 26,
    status: "Approved",
    revenue: 520.0,
    commission: 156.0,
    image: "/watercolor-abstract.png",
    shopUrl: "#",
  },
  {
    id: "P012",
    name: "Music Festival Poster",
    sales: 33,
    status: "Pending",
    revenue: 660.0,
    commission: 198.0,
    image: "/vibrant-music-festival.png",
    shopUrl: "#",
  },
];

// Helper function to get badge styling based on status
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
    case "Pending":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
    case "Will be deleted":
      return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800";
    case "Deleted":
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800";
    default:
      return "";
  }
};

// Define the columns for the product table with updated typography
const getColumns = (
  onDeleteProduct: (product: Product) => void
): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex items-center gap-3 font-normal text-foreground">
          {product.image && (
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              className="h-10 w-10 rounded-md object-cover"
            />
          )}
          <div>{product.name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "sales",
    header: () => <div className="text-center">Sales</div>,
    cell: ({ row }) => (
      <div className="text-center font-normal text-foreground">
        {row.original.sales}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center">Status</div>,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={`font-normal ${getStatusBadgeStyle(status)}`}
          >
            {status}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "revenue",
    header: () => <div className="text-right">Revenue</div>,
    cell: ({ row }) => (
      <div className="text-right font-normal text-[14px] text-foreground">
        £{row.original.revenue.toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "commission",
    header: () => <div className="text-right">Commission</div>,
    cell: ({ row }) => (
      <div className="text-right font-normal text-[14px] text-foreground">
        £{row.original.commission.toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "id",
    header: () => <div className="text-center">Product ID</div>,
    cell: ({ row }) => (
      <div className="text-center font-mono text-xs font-normal text-foreground">
        {row.original.id || "—"}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex justify-end">
          {product.shopUrl && (
            <Button variant="outline" size="sm" className="mr-2" asChild>
              <a
                href={product.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLinkIcon className="mr-2 size-4" />
                View in Shop
              </a>
            </Button>
          )}
          <DeleteProductButton product={product} onDelete={onDeleteProduct} />
        </div>
      );
    },
  },
];

// New component for delete button with confirmation dialog
function DeleteProductButton({
  product,
  onDelete,
}: {
  product: Product;
  onDelete: (product: Product) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2Icon className="h-4 w-4" />
        <span className="sr-only">Delete product</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product &quot;{product.name}
              &quot; from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(product);
                setOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ProductTableProps {
  products?: Product[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onDateRangeChange?: (range: DateRange) => void;
  onDateOptionChange?: (option: DateRangeOption) => void;
  currentDateOption?: DateRangeOption;
  dateRange?: DateRange;
}

export function ProductTable({
  products = [],
  isLoading = false,
  isRefreshing = false,
  onDateRangeChange,
  onDateOptionChange,
  currentDateOption = "this_month",
  dateRange,
}: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
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

  // Use query client for invalidating queries after delete
  const queryClient = useQueryClient();

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      try {
        // Get supabase client
        const supabase = createClient();

        // Check if product has an ID
        if (product.id) {
          // Delete the product from Supabase
          const { error } = await supabase
            .from("posters")
            .delete()
            .eq("id", product.id);

          if (error) {
            throw new Error(`Failed to delete product: ${error.message}`);
          }
        } else {
          throw new Error("Product ID not found");
        }
      } catch (error: any) {
        console.error("Error deleting product:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  // Handler for deleting a product
  const handleDeleteProduct = (product: Product) => {
    deleteProductMutation.mutate(product);
  };

  // Filter products based on search query
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.id &&
          product.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.shopifyProductId &&
          product.shopifyProductId
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  // Get columns with delete handler
  const columns = React.useMemo(
    () => getColumns(handleDeleteProduct),
    [handleDeleteProduct]
  );

  const table = useReactTable({
    data: filteredProducts,
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
      console.log("ProductTable received date range change:", range);
      if (onDateRangeChange) {
        onDateRangeChange(range);
      }
    },
    [onDateRangeChange]
  );

  // Handle date option change
  const handleDateOptionChange = React.useCallback(
    (option: DateRangeOption) => {
      console.log("ProductTable received date option change:", option);
      if (onDateOptionChange) {
        onDateOptionChange(option);
      }
    },
    [onDateOptionChange]
  );

  // Use a ref to track the initial loading state
  const isInitialLoadingRef = React.useRef(true);

  // When data is loaded, set the initial loading state to false
  React.useEffect(() => {
    if (!isLoading && isInitialLoadingRef.current) {
      isInitialLoadingRef.current = false;
    }
  }, [isLoading]);

  // Get the actual loading state
  const isLoadingData = isLoading || isRefreshing;

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">My Products</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[250px] pl-8"
              disabled={isLoadingData}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <React.Suspense fallback={<div>Loading filter...</div>}>
            <DateRangeFilter
              onRangeChange={handleDateRangeChange}
              defaultValues={dateRange}
              currentOption={currentDateOption}
            />
          </React.Suspense>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="relative overflow-x-auto">
          {isLoadingData && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <div className="flex items-center gap-2 bg-background px-6 py-3 rounded-md shadow-md">
                <svg
                  className="h-6 w-6 animate-spin text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-base font-medium">
                  Loading products...
                </span>
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
              {isLoadingData ? (
                // Show loading skeleton rows when data is loading
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {Array.from({ length: columns.length }).map(
                      (_, colIndex) => (
                        <TableCell
                          key={`skeleton-cell-${colIndex}`}
                          className={colIndex === 0 ? "w-[250px]" : ""}
                        >
                          <Skeleton
                            className={`h-8 ${
                              colIndex === 0 ? "w-full" : "w-16 mx-auto"
                            }`}
                          />
                        </TableCell>
                      )
                    )}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
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
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                      <span className="mb-2 text-lg">No products found</span>
                      <span className="text-sm">
                        {searchQuery
                          ? "Try a different search term"
                          : "Try selecting a different date range"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            Showing {table.getFilteredRowModel().rows.length} product(s)
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
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
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
                    {column.id === "name"
                      ? "Product Name"
                      : column.id === "id"
                      ? "Product ID"
                      : column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
