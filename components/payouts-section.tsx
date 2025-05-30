"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  InfoIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePayouts } from "@/hooks/use-payouts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

// Define the schema for the payout methods form (removed currency, accountHolder, and bic)
const payoutMethodsSchema = z.object({
  method: z.enum(["paypal", "iban"]),
  paypalEmail: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
  iban: z
    .string()
    .min(15, {
      message: "Please enter a valid IBAN.",
    })
    .optional(),
});

type PayoutMethodsValues = z.infer<typeof payoutMethodsSchema>;

export function PayoutsSection() {
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    React.useState(false);

  const {
    userProfile,
    payoutHistory,
    isLoadingProfile,
    isLoadingHistory,
    updatePayoutMethod,
    deletePayoutMethod,
    isUpdating,
    isDeleting,
  } = usePayouts();

  // Initialize the form with data from Supabase
  const form = useForm<PayoutMethodsValues>({
    resolver: zodResolver(payoutMethodsSchema),
    defaultValues: {
      method: "paypal",
      paypalEmail: "",
      iban: "",
    },
  });

  // Update form when user profile loads
  React.useEffect(() => {
    if (userProfile) {
      form.setValue("method", userProfile.payment_method || "paypal");
      if (userProfile.paypal_email) {
        form.setValue("paypalEmail", userProfile.paypal_email);
      }
      if (userProfile.iban) {
        form.setValue("iban", userProfile.iban);
      }
    }
  }, [userProfile, form]);

  // Watch for changes in the method field
  const selectedMethod = form.watch("method");
  const activeMethod = userProfile?.payment_method;

  // Handle method change
  React.useEffect(() => {
    if (selectedMethod !== activeMethod && activeMethod !== null) {
      // Reset to the active method if trying to change without deleting first
      form.setValue("method", activeMethod || "paypal");
      toast.error(
        "Please delete the current payout method before selecting a new one"
      );
    }
  }, [selectedMethod, activeMethod, form]);

  // Handle delete confirmation
  const handleDeleteMethod = () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm deletion
  const confirmDeleteMethod = () => {
    deletePayoutMethod();
    setShowDeleteConfirmation(false);
  };

  // Form submission handler
  function onSubmit(data: PayoutMethodsValues) {
    updatePayoutMethod(data);
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-8 px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Payouts</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Payout Methods</CardTitle>
            <CardDescription>
              Loading your payout information...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Payouts</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Methods</CardTitle>
          <CardDescription>
            Configure how you would like to receive your earnings. You can only
            have one active payout method at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payout Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="paypal"
                            id="paypal"
                            disabled={activeMethod === "iban"}
                          />
                          <Label
                            htmlFor="paypal"
                            className={
                              activeMethod === "iban"
                                ? "text-muted-foreground"
                                : ""
                            }
                          >
                            PayPal
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="iban"
                            id="iban"
                            disabled={activeMethod === "paypal"}
                          />
                          <Label
                            htmlFor="iban"
                            className={
                              activeMethod === "paypal"
                                ? "text-muted-foreground"
                                : ""
                            }
                          >
                            Bank Transfer (IBAN)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Select your preferred payout method. To change methods,
                      you must first delete your current method.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedMethod === "paypal" && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paypalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PayPal Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your-email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the email address associated with your PayPal
                          account.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {selectedMethod === "iban" && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="DE89 3704 0044 0532 0130 00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your International Bank Account Number (IBAN).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {activeMethod && (
                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertCircleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle>Active Payout Method</AlertTitle>
                  <AlertDescription className="flex justify-between items-center">
                    <span>
                      You currently have an active{" "}
                      {activeMethod === "paypal" ? "PayPal" : "IBAN"} payout
                      method. To change methods, you must first delete this one.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={handleDeleteMethod}
                      disabled={isDeleting}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={activeMethod !== null || isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Payout Method"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            View your past and upcoming payouts. Payouts are processed on the
            15th of each month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !payoutHistory || payoutHistory.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-muted-foreground">
              No payout history available yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-mono text-xs">
                        PO-{payout.id}
                      </TableCell>
                      <TableCell>{payout.period}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payout.amount, payout.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{payout.method}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payout.status === "completed"
                              ? "success"
                              : "default"
                          }
                          className={
                            payout.status === "completed"
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                          }
                        >
                          {payout.status === "completed" ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you sure you want to remove this payout method?
            </DialogTitle>
            <DialogDescription>
              This will delete your current{" "}
              {activeMethod === "paypal" ? "PayPal" : "IBAN"} payout method. You
              will need to set up a new payout method to receive future
              payments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMethod}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
