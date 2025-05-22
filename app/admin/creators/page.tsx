"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Hourglass, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { createClient } from "@/utils/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface Creator {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  bio?: string;
  instagram?: string;
  portfolio?: string;
  created_at?: string;
  [key: string]: unknown; // Better type than any
}

const CreatorsManagement = () => {
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

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
    fetchCurrentUser();
  }, [router, supabase]);

  // Fetch creators using react-query
  const {
    data: creators = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      try {
        console.log("Fetching creators from API...");
        if (currentUser?.id) {
          console.log("Current admin user:", currentUser.id);
        }

        const response = await fetch("/api/admin/creators");
        if (!response.ok) {
          throw new Error("Failed to fetch creators");
        }

        const data = await response.json();
        console.log(`API returned ${data.length} creator documents`);

        if (!data || data.length === 0) {
          console.log("No creators found");
          return [];
        }

        const creatorsData = data.map((item: Creator) => {
          console.log(`Processing creator ${item.id}:`, item);

          // Format any dates
          const formattedItem = { ...item };
          if (formattedItem.created_at) {
            formattedItem.created_at = new Date(
              formattedItem.created_at
            ).toLocaleDateString();
          }

          return formattedItem;
        });

        console.log("Processed creators:", creatorsData);
        return creatorsData;
      } catch (error) {
        console.error("Error fetching creators:", error);
        throw error;
      }
    },
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update creator approval status mutation
  const updateCreatorMutation = useMutation({
    mutationFn: async ({
      creatorId,
      approved,
    }: {
      creatorId: string;
      approved: boolean;
    }) => {
      console.log(
        `Updating creator ${creatorId} approval status to: ${approved}`
      );
      const response = await fetch("/api/admin/creators", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorId,
          status: approved, // API expects 'status', but we're passing the boolean value
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update creator");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creators"] });
    },
    onError: (error) => {
      console.error("Error updating creator:", error);
      throw error;
    },
  });

  // Set filtered creators when creators or filter changes
  useEffect(() => {
    if (!creators) return;

    if (selectedFilter === "all") {
      setFilteredCreators(creators);
    } else if (selectedFilter === "approved") {
      setFilteredCreators(
        creators.filter((creator: Creator) => creator.approved === true)
      );
    } else if (selectedFilter === "pending") {
      setFilteredCreators(
        creators.filter((creator: Creator) => creator.approved === false)
      );
    }
  }, [selectedFilter, creators]);

  // Display error toast when there's an error
  useEffect(() => {
    if (queryError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load creators. Please try again.",
      });
    }
  }, [queryError, toast]);

  const handleApprovalToggle = async (
    creatorId: string,
    currentApproval: boolean
  ) => {
    try {
      setIsUpdating(creatorId); // Set updating state to show loading indicator

      await updateCreatorMutation.mutateAsync({
        creatorId,
        approved: !currentApproval,
      });

      toast({
        title: "Status Updated",
        description: `Creator ${
          !currentApproval ? "approved" : "set to pending"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating creator status:", error);
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: "Failed to update creator status. Please try again.",
      });
    } finally {
      setIsUpdating(null); // Clear updating state
    }
  };

  const handleViewCreator = (creator: Creator) => {
    setSelectedCreator(creator);
    setDialogOpen(true);
  };

  const renderCreatorDetailRows = () => {
    if (!selectedCreator) return null;

    const excludeKeys = [
      "id",
      "name",
      "email",
      "approved",
      "plan",
      "uploadLimit",
      "uploadsUsed",
      "totalSales",
    ];

    return Object.entries(selectedCreator)
      .filter(([key]) => !excludeKeys.includes(key))
      .map(([key, value]) => {
        // Skip functions and complex objects
        if (
          typeof value === "function" ||
          (typeof value === "object" &&
            value !== null &&
            !(value instanceof Date))
        ) {
          return null;
        }

        // Format timestamp
        if (
          value &&
          typeof value === "object" &&
          "toDate" in value &&
          typeof value.toDate === "function"
        ) {
          value = value.toDate().toLocaleString();
        }

        // Only show fields that have values
        if (value === undefined || value === null || value === "") {
          return null;
        }

        return (
          <div key={key} className="grid grid-cols-3 py-2 border-b">
            <span className="font-medium capitalize">
              {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
            </span>
            <span className="col-span-2">{String(value)}</span>
          </div>
        );
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Creators Management</h1>
        <p className="text-gray-500 mt-1">
          Manage and approve creator accounts
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">Filter by:</span>
        <div className="flex space-x-2">
          <Toggle
            pressed={selectedFilter === "all"}
            onPressedChange={() => setSelectedFilter("all")}
            variant="outline"
            size="sm"
          >
            All
          </Toggle>
          <Toggle
            pressed={selectedFilter === "approved"}
            onPressedChange={() => setSelectedFilter("approved")}
            variant="outline"
            size="sm"
          >
            Approved
          </Toggle>
          <Toggle
            pressed={selectedFilter === "pending"}
            onPressedChange={() => setSelectedFilter("pending")}
            variant="outline"
            size="sm"
          >
            Pending
          </Toggle>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Creators</CardTitle>
          <CardDescription>
            View and manage all creator accounts in the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              An error occurred while fetching creators.
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading creators...
                    </TableCell>
                  </TableRow>
                ) : filteredCreators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No creators found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreators.map((creator) => (
                    <TableRow key={creator.id}>
                      <TableCell className="font-medium">
                        {creator.name}
                      </TableCell>
                      <TableCell>{creator.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {creator.approved ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">Approved</span>
                            </>
                          ) : (
                            <>
                              <Hourglass className="w-4 h-4 text-yellow-500" />
                              <span className="text-yellow-600">Pending</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={creator.approved === true}
                          onCheckedChange={() =>
                            handleApprovalToggle(creator.id, creator.approved)
                          }
                          className="data-[state=checked]:bg-green-500"
                          disabled={
                            isUpdating === creator.id ||
                            updateCreatorMutation.isPending
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleViewCreator(creator)}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Creator Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Creator Details</DialogTitle>
            <DialogDescription>
              {selectedCreator?.name} ({selectedCreator?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-3 py-2 border-b">
              <span className="font-medium">Status</span>
              <span className="col-span-2 flex items-center">
                {selectedCreator?.approved ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="w-4 h-4 mr-1" /> Approved
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center">
                    <Hourglass className="w-4 h-4 mr-1" /> Pending
                  </span>
                )}
              </span>
            </div>
            {renderCreatorDetailRows()}
          </div>

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorsManagement;
