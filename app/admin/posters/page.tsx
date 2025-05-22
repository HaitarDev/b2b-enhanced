"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Check, Eye, ExternalLink, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PosterData {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  imageUrl: string;
  status: "pending" | "approved" | "rejected" | "willBeDeleted";
  uploadDate: string;
  description?: string;
  driveLink?: string;
  shopifyUrl?: string;
  shopifyProductId?: string;
  prices?: {
    [key: string]: string;
  };
}

export default function PosterManagement() {
  const [filteredPosters, setFilteredPosters] = useState<PosterData[]>([]);
  const [selectedPoster, setSelectedPoster] = useState<PosterData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shopifyUrlDialogOpen, setShopifyUrlDialogOpen] = useState(false);
  const [shopifyUrl, setShopifyUrl] = useState("");
  const [shopifyProductId, setShopifyProductId] = useState("");
  const [filters, setFilters] = useState({
    title: "",
    creatorName: "",
    productId: "",
    status: "",
  });
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Check authentication and admin status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Redirect if not authenticated
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!data || data.role !== "admin") {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "You don't have permission to access this page.",
        });
        router.push("/");
      }
    };

    checkAuth();
  }, []);

  // Fetch posters from API
  const { data: posters = [], isLoading } = useQuery({
    queryKey: ["posters"],
    queryFn: async () => {
      const response = await fetch("/api/admin/posters");
      if (!response.ok) {
        throw new Error("Failed to fetch posters");
      }
      return response.json() as Promise<PosterData[]>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update poster status
  const updatePosterMutation = useMutation({
    mutationFn: async ({
      posterId,
      status,
      shopifyUrl,
      shopifyProductId,
    }: {
      posterId: string;
      status?: string;
      shopifyUrl?: string;
      shopifyProductId?: string;
    }) => {
      const response = await fetch("/api/admin/posters", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          posterId,
          status,
          shopifyUrl,
          shopifyProductId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update poster");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posters"] });
    },
  });

  // Delete poster
  const deletePosterMutation = useMutation({
    mutationFn: async (posterId: string) => {
      const response = await fetch(`/api/admin/posters?id=${posterId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete poster");
      }

      return posterId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posters"] });
    },
  });

  // Filter posters when filters or poster data changes
  useEffect(() => {
    filterPosters();
  }, [posters, filters]);

  const filterPosters = () => {
    let result = [...posters];

    if (filters.title) {
      result = result.filter((poster) =>
        poster.title.toLowerCase().includes(filters.title.toLowerCase())
      );
    }

    if (filters.creatorName) {
      result = result.filter((poster) =>
        poster.creatorName
          .toLowerCase()
          .includes(filters.creatorName.toLowerCase())
      );
    }

    if (filters.productId) {
      result = result.filter((poster) =>
        poster.shopifyProductId
          ?.toLowerCase()
          .includes(filters.productId.toLowerCase())
      );
    }

    if (filters.status) {
      result = result.filter((poster) => poster.status === filters.status);
    }

    setFilteredPosters(result);
  };

  const handleStatusUpdate = async (
    posterId: string,
    creatorId: string,
    newStatus: "approved" | "rejected" | "willBeDeleted"
  ) => {
    try {
      console.log(
        `Updating poster ${posterId} for creator ${creatorId} to status: ${newStatus}`
      );

      await updatePosterMutation.mutateAsync({
        posterId,
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `Poster ${newStatus} successfully`,
      });

      if (newStatus === "approved") {
        const posterToUpdate = posters.find((p) => p.id === posterId);
        if (posterToUpdate) {
          setSelectedPoster({ ...posterToUpdate, status: newStatus });
          setShopifyUrl(posterToUpdate.shopifyUrl || "");
          setShopifyProductId(posterToUpdate.shopifyProductId || "");
          setShopifyUrlDialogOpen(true);
        }
      }
    } catch (error) {
      console.error("Error updating poster status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update poster status",
      });
    }
  };

  const handleSaveShopifyUrl = async () => {
    if (!selectedPoster) return;

    try {
      await updatePosterMutation.mutateAsync({
        posterId: selectedPoster.id,
        shopifyUrl: shopifyUrl.trim(),
        shopifyProductId: shopifyProductId.trim(),
      });

      toast({
        title: "Product details saved",
        description: "Shopify product URL and ID have been saved successfully",
      });

      setShopifyUrlDialogOpen(false);
    } catch (error) {
      console.error("Error saving Shopify details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save Shopify product details",
      });
    }
  };

  const viewPosterDetails = (poster: PosterData) => {
    setSelectedPoster(poster);
    setDialogOpen(true);
    setShopifyUrl(poster.shopifyUrl || "");
    setShopifyProductId(poster.shopifyProductId || "");
  };

  const handleOpenShopifyUrlDialog = (poster: PosterData) => {
    setSelectedPoster(poster);
    setShopifyUrl(poster.shopifyUrl || "");
    setShopifyProductId(poster.shopifyProductId || "");
    setShopifyUrlDialogOpen(true);
  };

  const handleDeletePoster = async () => {
    if (!selectedPoster) return;

    try {
      await deletePosterMutation.mutateAsync(selectedPoster.id);

      toast({
        title: "Poster Deleted",
        description: "The poster has been successfully deleted",
      });

      setDeleteDialogOpen(false);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error deleting poster:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete poster. Please try again.",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "outline";
      case "rejected":
        return "destructive";
      case "willBeDeleted":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "willBeDeleted":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      default:
        return undefined;
    }
  };

  const formatStatus = (status: string | undefined): string => {
    if (!status) return "Unknown";
    if (status === "willBeDeleted") return "Will be deleted";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Poster Management</h1>
        <p className="text-gray-500 mt-1">
          Review and approve creator poster submissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posters</CardTitle>
          <CardDescription>
            Manage poster submissions from creators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label
                htmlFor="titleFilter"
                className="text-sm font-medium mb-2 block"
              >
                Filter by Title
              </Label>
              <Input
                id="titleFilter"
                placeholder="Search by title..."
                value={filters.title}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label
                htmlFor="creatorFilter"
                className="text-sm font-medium mb-2 block"
              >
                Filter by Creator
              </Label>
              <Input
                id="creatorFilter"
                placeholder="Search by creator..."
                value={filters.creatorName}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    creatorName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label
                htmlFor="productIdFilter"
                className="text-sm font-medium mb-2 block"
              >
                Filter by Product ID
              </Label>
              <Input
                id="productIdFilter"
                placeholder="Search by Product ID..."
                value={filters.productId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, productId: e.target.value }))
                }
              />
            </div>
            <div>
              <Label
                htmlFor="statusFilter"
                className="text-sm font-medium mb-2 block"
              >
                Filter by Status
              </Label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({ ...prev, status: value }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="willBeDeleted">Will be deleted</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shopify Link</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading posters...
                    </TableCell>
                  </TableRow>
                ) : filteredPosters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No posters found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosters.map((poster) => (
                    <TableRow key={poster.id}>
                      <TableCell className="font-medium">
                        {poster.creatorName}
                      </TableCell>
                      <TableCell>{poster.title}</TableCell>
                      <TableCell>{poster.uploadDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(poster.status)}
                          className={getStatusBadgeClass(poster.status)}
                        >
                          {formatStatus(poster.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {poster.shopifyUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="px-2 h-7"
                          >
                            <a
                              href={poster.shopifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </a>
                          </Button>
                        ) : (
                          poster.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2 h-7"
                              onClick={() => handleOpenShopifyUrlDialog(poster)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Add Link
                            </Button>
                          )
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {poster.shopifyProductId || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewPosterDetails(poster)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {poster.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleStatusUpdate(
                                    poster.id,
                                    poster.creatorId,
                                    "approved"
                                  )
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedPoster(poster);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                          {poster.status === "willBeDeleted" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedPoster(poster);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                          {poster.status === "approved" &&
                            !poster.shopifyUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenShopifyUrlDialog(poster)
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Add Link
                              </Button>
                            )}
                          {poster.shopifyUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenShopifyUrlDialog(poster)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Edit Poster
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPoster?.title}</DialogTitle>
            <DialogDescription>
              Uploaded by {selectedPoster?.creatorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPoster?.imageUrl && (
              <div className="relative pt-[60%] rounded-lg overflow-hidden">
                <img
                  src={selectedPoster.imageUrl}
                  alt={selectedPoster.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium">Status</span>
                <span className="col-span-2">
                  <Badge
                    variant={getStatusBadgeVariant(
                      selectedPoster?.status || ""
                    )}
                    className={getStatusBadgeClass(
                      selectedPoster?.status || ""
                    )}
                  >
                    {formatStatus(selectedPoster?.status)}
                  </Badge>
                </span>
              </div>

              {selectedPoster?.description && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Description</span>
                  <span className="col-span-2">
                    {selectedPoster.description}
                  </span>
                </div>
              )}

              {selectedPoster?.driveLink && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Drive Link</span>
                  <a
                    href={selectedPoster.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 text-blue-600 hover:underline"
                  >
                    {selectedPoster.driveLink}
                  </a>
                </div>
              )}

              {selectedPoster?.shopifyUrl && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Shopify URL</span>
                  <div className="col-span-2 flex items-center">
                    <a
                      href={selectedPoster.shopifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {selectedPoster.shopifyUrl}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setDialogOpen(false);
                        setTimeout(() => {
                          handleOpenShopifyUrlDialog(selectedPoster);
                        }, 300);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}

              {selectedPoster?.shopifyProductId && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-medium">Product ID</span>
                  <span className="col-span-2 font-mono">
                    {selectedPoster.shopifyProductId}
                  </span>
                </div>
              )}

              {selectedPoster?.prices &&
                Object.keys(selectedPoster.prices).length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    <span className="font-medium">Prices</span>
                    <div className="col-span-2">
                      {Object.entries(selectedPoster.prices).map(
                        ([size, price]) => (
                          <div key={size}>
                            {size}: £{price}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium">Upload Date</span>
                <span className="col-span-2">{selectedPoster?.uploadDate}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {selectedPoster?.status === "pending" && (
                <>
                  <Button
                    variant="default"
                    onClick={() => {
                      if (selectedPoster) {
                        setDialogOpen(false);
                        setTimeout(() => {
                          handleStatusUpdate(
                            selectedPoster.id,
                            selectedPoster.creatorId,
                            "approved"
                          );
                        }, 300);
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (selectedPoster) {
                        setDialogOpen(false);
                        setTimeout(() => {
                          setSelectedPoster(selectedPoster);
                          setDeleteDialogOpen(true);
                        }, 300);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}

              {selectedPoster?.status === "willBeDeleted" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDialogOpen(false);
                    setTimeout(() => {
                      setDeleteDialogOpen(true);
                    }, 300);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Poster
                </Button>
              )}

              {selectedPoster?.status === "approved" &&
                !selectedPoster?.shopifyUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setTimeout(() => {
                        if (selectedPoster) {
                          handleOpenShopifyUrlDialog(selectedPoster);
                        }
                      }, 300);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Add Shopify Link
                  </Button>
                )}
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={shopifyUrlDialogOpen}
        onOpenChange={setShopifyUrlDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedPoster?.status === "willBeDeleted"
                ? "Edit Poster"
                : selectedPoster?.shopifyUrl
                ? "Update Shopify Product Details"
                : "Add Shopify Product Details"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPoster?.status === "willBeDeleted"
                ? "Edit poster information before deletion."
                : "Add or update the Shopify product link and ID for this poster."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopifyUrl">Product URL</Label>
              <Input
                id="shopifyUrl"
                placeholder="https://deinspar.com/products/product-name"
                value={shopifyUrl}
                onChange={(e) => setShopifyUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopifyProductId">Product ID</Label>
              <Input
                id="shopifyProductId"
                placeholder="Enter Shopify product ID"
                value={shopifyProductId}
                onChange={(e) => setShopifyProductId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The Shopify product ID is used to track sales and revenue data.
              </p>
            </div>

            {selectedPoster?.status === "willBeDeleted" && (
              <div className="pt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setShopifyUrlDialogOpen(false);
                    setTimeout(() => {
                      setDeleteDialogOpen(true);
                    }, 300);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Poster
                </Button>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShopifyUrlDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveShopifyUrl}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Poster</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this poster? This
              action cannot be undone and will remove the poster completely from
              the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePoster}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
