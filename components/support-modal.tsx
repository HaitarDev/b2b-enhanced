"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useCallback, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// Define the schema for the support form
const supportFormSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  subject: z.string().min(3, {
    message: "Subject must be at least 3 characters.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: {
    name: string;
    email: string;
    id?: string; // Optional user ID (will be overridden by the current user's ID)
  };
}

export function SupportModal({
  open,
  onOpenChange,
  userData: propUserData,
}: SupportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // Fetch the current authenticated user's information
  const {
    data: authData,
    isLoading,
    error: authError,
  } = useQuery({
    queryKey: ["userAuth", open], // Refetch when modal opens
    queryFn: async () => {
      // Only fetch if the modal is open
      if (!open) return null;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Use the provided userData if not authenticated
        return {
          profile: propUserData,
          authenticated: false,
        };
      }

      // Fetch user profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", user.id)
        .single();

      if (error) {
        throw new Error("Failed to fetch user profile");
      }

      return {
        profile: profile || propUserData,
        authenticated: true,
        userId: user.id,
      };
    },
    enabled: open, // Only run the query when the modal is open
    refetchOnWindowFocus: false,
  });

  // Determine the user data to use (authenticated or prop)
  const userData = authData?.profile || propUserData;
  const userId = authData?.authenticated ? authData.userId : propUserData.id;

  // Initialize the form with default values
  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: userData.name || "",
      email: userData.email || "",
      subject: "",
      message: "",
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (userData) {
      form.setValue("name", userData.name || "");
      form.setValue("email", userData.email || "");
    }
  }, [form, userData]);

  // Support message submission mutation
  const submitSupportMessage = useMutation({
    mutationFn: async (data: SupportFormValues & { userId?: string }) => {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit support message");
      }

      return response.json();
    },
    onSuccess: () => {
      // Close the modal
      onOpenChange(false);

      // Reset the form
      form.reset({
        name: userData.name || "",
        email: userData.email || "",
        subject: "",
        message: "",
      });

      // Show success notification
      toast.success("Message sent", {
        description:
          "We've received your message and will get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to send message", {
        description: error.message || "Please try again later.",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = useCallback(
    async (data: SupportFormValues) => {
      setIsSubmitting(true);

      // Submit the data with user ID if available
      await submitSupportMessage.mutateAsync({
        ...data,
        userId: userId,
      });
    },
    [userId, submitSupportMessage]
  );

  // Show an error if authentication failed
  if (authError && open) {
    toast.error("Authentication Error", {
      description: "Could not verify your identity. Please try again later.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Send us a message and we'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              Loading your information...
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="How can we help you?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your issue or question in detail..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
