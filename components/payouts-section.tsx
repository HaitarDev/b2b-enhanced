"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AlertCircleIcon, CheckIcon, ChevronsUpDownIcon, CreditCardIcon, InfoIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Define the schema for the payout methods form
const payoutMethodsSchema = z.object({
  method: z.enum(["paypal", "iban"]),
  currency: z.enum(["GBP", "EUR", "USD"]),
  paypalEmail: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
  accountHolder: z
    .string()
    .min(3, {
      message: "Account holder name must be at least 3 characters.",
    })
    .optional(),
  iban: z
    .string()
    .min(15, {
      message: "Please enter a valid IBAN.",
    })
    .optional(),
  bic: z
    .string()
    .min(8, {
      message: "Please enter a valid BIC/SWIFT code.",
    })
    .optional(),
})

type PayoutMethodsValues = z.infer<typeof payoutMethodsSchema>

// Define the payout history data structure
type PayoutHistory = {
  id: string
  date: Date
  period: string
  amount: number
  shopCurrency: "GBP" // Shop currency is always GBP
  method: "PayPal" | "IBAN"
  currency: "GBP" | "EUR" | "USD" // Payout currency selected by artist
  status: "Pending" | "Paid"
}

// Sample payout history data
const samplePayoutHistory: PayoutHistory[] = [
  {
    id: "PO-2024-001",
    date: new Date("2024-05-15"),
    period: "April 2024",
    amount: 324.5,
    shopCurrency: "GBP",
    method: "PayPal",
    currency: "GBP",
    status: "Paid",
  },
  {
    id: "PO-2024-002",
    date: new Date("2024-06-15"),
    period: "May 2024",
    amount: 412.75,
    shopCurrency: "GBP",
    method: "PayPal",
    currency: "GBP",
    status: "Pending",
  },
  {
    id: "PO-2024-003",
    date: new Date("2024-04-15"),
    period: "March 2024",
    amount: 287.2,
    shopCurrency: "GBP",
    method: "PayPal",
    currency: "EUR",
    status: "Paid",
  },
  {
    id: "PO-2024-004",
    date: new Date("2024-03-15"),
    period: "February 2024",
    amount: 356.9,
    shopCurrency: "GBP",
    method: "IBAN",
    currency: "EUR",
    status: "Paid",
  },
  {
    id: "PO-2024-005",
    date: new Date("2024-02-15"),
    period: "January 2024",
    amount: 198.45,
    shopCurrency: "GBP",
    method: "IBAN",
    currency: "USD",
    status: "Paid",
  },
]

const currencies = [
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
]

// Sample exchange rates (as of a fictional date)
const exchangeRates = {
  GBP: {
    EUR: 1.17, // 1 GBP = 1.17 EUR
    USD: 1.27, // 1 GBP = 1.27 USD
    GBP: 1.0, // 1 GBP = 1 GBP (no conversion)
  },
  EUR: {
    GBP: 0.85, // 1 EUR = 0.85 GBP
    USD: 1.09, // 1 EUR = 1.09 USD
    EUR: 1.0, // 1 EUR = 1 EUR (no conversion)
  },
  USD: {
    GBP: 0.79, // 1 USD = 0.79 GBP
    EUR: 0.92, // 1 USD = 0.92 EUR
    USD: 1.0, // 1 USD = 1 USD (no conversion)
  },
}

export function PayoutsSection() {
  const [activeMethod, setActiveMethod] = React.useState<"paypal" | "iban" | null>("paypal")
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false)
  const [payoutHistory] = React.useState<PayoutHistory[]>(samplePayoutHistory)
  const [open, setOpen] = React.useState(false)

  // Initialize the form with default values
  const form = useForm<PayoutMethodsValues>({
    resolver: zodResolver(payoutMethodsSchema),
    defaultValues: {
      method: "paypal",
      currency: "GBP",
      paypalEmail: "hamza@deinspar.com",
      accountHolder: "",
      iban: "",
      bic: "",
    },
  })

  // Watch for changes in the method field
  const selectedMethod = form.watch("method")
  const selectedCurrency = form.watch("currency")

  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find((c) => c.value === currencyCode)
    return currency ? currency.symbol : currencyCode
  }

  // Convert amount between currencies
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount

    const rate =
      exchangeRates[fromCurrency as keyof typeof exchangeRates]?.[
        toCurrency as keyof (typeof exchangeRates)[keyof typeof exchangeRates]
      ]
    if (!rate) return amount // Fallback if rate not found

    return amount * rate
  }

  // Handle method change
  React.useEffect(() => {
    if (selectedMethod !== activeMethod && activeMethod !== null) {
      // Reset to the active method if trying to change without deleting first
      form.setValue("method", activeMethod)
      toast.error("Please delete the current payout method before selecting a new one")
    }
  }, [selectedMethod, activeMethod, form])

  // Handle delete confirmation
  const handleDeleteMethod = () => {
    setShowDeleteConfirmation(true)
  }

  // Confirm deletion
  const confirmDeleteMethod = () => {
    setActiveMethod(null)

    // Reset form fields based on which method was deleted
    if (activeMethod === "paypal") {
      form.setValue("paypalEmail", "")
    } else {
      form.setValue("accountHolder", "")
      form.setValue("iban", "")
      form.setValue("bic", "")
    }

    setShowDeleteConfirmation(false)
    toast.success("Payout method removed successfully")
  }

  // Form submission handler
  function onSubmit(data: PayoutMethodsValues) {
    // Set the active method based on the form data
    setActiveMethod(data.method)

    // Show success notification
    toast.success("Payout method saved successfully")
    console.log("Form submitted:", data)
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
            Configure how you would like to receive your earnings. You can only have one active payout method at a time.
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
                          <RadioGroupItem value="paypal" id="paypal" disabled={activeMethod === "iban"} />
                          <Label htmlFor="paypal" className={activeMethod === "iban" ? "text-muted-foreground" : ""}>
                            PayPal
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="iban" id="iban" disabled={activeMethod === "paypal"} />
                          <Label htmlFor="iban" className={activeMethod === "paypal" ? "text-muted-foreground" : ""}>
                            Bank Transfer (IBAN)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Select your preferred payout method. To change methods, you must first delete your current method.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Preferred Currency</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                            disabled={activeMethod !== null}
                          >
                            {field.value
                              ? currencies.find((currency) => currency.value === field.value)?.label
                              : "Select currency..."}
                            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search currency..." />
                          <CommandList>
                            <CommandEmpty>No currency found.</CommandEmpty>
                            <CommandGroup>
                              {currencies.map((currency) => (
                                <CommandItem
                                  key={currency.value}
                                  value={currency.value}
                                  onSelect={(currentValue) => {
                                    form.setValue("currency", currentValue as "GBP" | "EUR" | "USD")
                                    setOpen(false)
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === currency.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {currency.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Select the currency you would like to receive your payouts in.</FormDescription>
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
                          <Input placeholder="your-email@example.com" {...field} />
                        </FormControl>
                        <FormDescription>Enter the email address associated with your PayPal account.</FormDescription>
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
                    name="accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormDescription>Enter the full name of the bank account holder.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input placeholder="DE89 3704 0044 0532 0130 00" {...field} />
                        </FormControl>
                        <FormDescription>Enter your International Bank Account Number (IBAN).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BIC/SWIFT</FormLabel>
                        <FormControl>
                          <Input placeholder="DEUTDEDBXXX" {...field} />
                        </FormControl>
                        <FormDescription>Enter the Bank Identifier Code (BIC) or SWIFT code.</FormDescription>
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
                      You currently have an active {activeMethod === "paypal" ? "PayPal" : "IBAN"} payout method with{" "}
                      {selectedCurrency} as your preferred currency. To change methods, you must first delete this one.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={handleDeleteMethod}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={activeMethod !== null}>
                  Save Payout Method
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
            View your past and upcoming payouts. Payouts are processed on the 15th of each month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount (Shop)</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Paid Out
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              Amount converted to your selected payout currency based on the exchange rate at the time
                              of payment.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutHistory.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-xs">{payout.id}</TableCell>
                    <TableCell>{payout.period}</TableCell>
                    <TableCell className="text-right font-medium">
                      {getCurrencySymbol(payout.shopCurrency)}
                      {payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {getCurrencySymbol(payout.currency)}
                      {convertCurrency(payout.amount, payout.shopCurrency, payout.currency).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                        {payout.method}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={payout.status === "Paid" ? "success" : "default"}
                        className={
                          payout.status === "Paid"
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to remove this payout method?</DialogTitle>
            <DialogDescription>
              This will delete your current {activeMethod === "paypal" ? "PayPal" : "IBAN"} payout method. You will need
              to set up a new payout method to receive future payments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMethod}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
