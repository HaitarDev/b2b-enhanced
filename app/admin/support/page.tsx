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
import { Eye } from "lucide-react";
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
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SupportMessage {
  id: string;
  creator: string;
  subject: string;
  email?: string;
  date: string;
  status: string;
  message: string;
}

const SupportMessages = () => {
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
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

  // Fetch support messages
  const {
    data: supportMessages = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["supportMessages"],
    queryFn: async () => {
      try {
        console.log("Fetching support messages from API...");

        const response = await fetch("/api/admin/support");
        if (!response.ok) {
          throw new Error("Failed to fetch support messages");
        }

        const data = await response.json();
        console.log(`API returned ${data.length} support messages`);

        return data as SupportMessage[];
      } catch (error) {
        console.error("Error fetching support messages:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update message status mutation
  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({
      messageId,
      status,
    }: {
      messageId: string;
      status: string;
    }) => {
      console.log(`Updating message ${messageId} status to: ${status}`);
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update message status");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportMessages"] });
    },
    onError: (error) => {
      console.error("Error updating message status:", error);
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: "Failed to update message status. Please try again.",
      });
    },
  });

  const handleViewMessage = (message: SupportMessage) => {
    setSelectedMessage(message);
    setDialogOpen(true);
  };

  const handleStatusToggle = async (
    messageId: string,
    currentStatus: string
  ) => {
    try {
      const newStatus = currentStatus === "solved" ? "pending" : "solved";

      await updateMessageStatusMutation.mutateAsync({
        messageId,
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `Message marked as ${newStatus}`,
      });
    } catch (error) {
      // Error is handled by mutation
      console.error("Error in handleStatusToggle:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Messages</h1>
        <p className="text-gray-500 mt-1">Manage inquiries from creators</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Support Messages</CardTitle>
          <CardDescription>
            View and respond to messages from creators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryError && !isLoading && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              An error occurred while fetching support messages.
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Solved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mr-2"></div>
                        Loading messages...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : supportMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No support messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  supportMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">
                        {message.creator}
                      </TableCell>
                      <TableCell>{message.subject || "No subject"}</TableCell>
                      <TableCell>{message.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            message.status === "solved"
                              ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300"
                              : message.status === "new"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300"
                              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300"
                          }
                        >
                          {message.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={message.status === "solved"}
                          onCheckedChange={() =>
                            handleStatusToggle(message.id, message.status)
                          }
                          className="data-[state=checked]:bg-green-500"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMessage(message)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMessage?.subject || "No subject"}
            </DialogTitle>
            <DialogDescription className="flex flex-col space-y-1 pt-2">
              <span className="text-sm font-medium">
                From: {selectedMessage?.creator}
              </span>
              {selectedMessage?.email && (
                <span className="text-sm">Email: {selectedMessage.email}</span>
              )}
              <span className="text-sm">Date: {selectedMessage?.date}</span>
              <span className="text-sm">
                Status:
                <Badge
                  variant="outline"
                  className={`ml-2 ${
                    selectedMessage?.status === "new"
                      ? "bg-blue-100 text-blue-800"
                      : selectedMessage?.status === "in-progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {selectedMessage?.status}
                </Badge>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="border-t border-b py-4 my-4">
            <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportMessages;
