"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircleIcon,
  CheckIcon,
  ImageIcon,
  InfoIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { submitPoster } from "@/app/actions/poster";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Define the predefined poster sizes with recommended resolutions
const PREDEFINED_SIZES = [
  {
    id: "a4",
    label: "21 × 30 cm (A4)",
    defaultPrice: "20.00",
    recommendedWidth: 2481,
    recommendedHeight: 3543,
  },
  {
    id: "30x40",
    label: "30 × 40 cm (3:4)",
    defaultPrice: "35.00",
    recommendedWidth: 3543,
    recommendedHeight: 4724,
  },
  {
    id: "50x70",
    label: "50 × 70 cm (Standard)",
    defaultPrice: "55.00",
    recommendedWidth: 5906,
    recommendedHeight: 8268,
  },
  {
    id: "70x100",
    label: "70 × 100 cm (Large Standard)",
    defaultPrice: "75.00",
    recommendedWidth: 8268,
    recommendedHeight: 11811,
  },
  {
    id: "50x50",
    label: "50 × 50 cm (1:1)",
    defaultPrice: "50.00",
    recommendedWidth: 5906,
    recommendedHeight: 5906,
  },
];

// Define quality levels
type QualityLevel = "good" | "medium" | "poor";

// Define the schema for the upload form
const uploadFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  googleDriveLink: z
    .string()
    .url({
      message: "Please enter a valid URL.",
    })
    .optional()
    .or(z.literal("")),
  availableSizes: z.array(
    z.object({
      id: z.string(),
      selected: z.boolean(),
      price: z.string(),
      file: z.any().optional(),
    })
  ),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = React.useState<{ [key: string]: File | null }>({});
  const [previews, setPreviews] = React.useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = React.useState<{
    [key: string]: boolean;
  }>({});
  const [uploadProgress, setUploadProgress] = React.useState<{
    [key: string]: number;
  }>({});
  const [uploading, setUploading] = React.useState<{ [key: string]: boolean }>(
    {}
  );
  const [uploadComplete, setUploadComplete] = React.useState<{
    [key: string]: boolean;
  }>({});
  const [imageDimensions, setImageDimensions] = React.useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const [imageQuality, setImageQuality] = React.useState<{
    [key: string]: QualityLevel;
  }>({});
  const [commissionRate] = React.useState(0.3); // 30% commission rate
  const [showDraftConfirmation, setShowDraftConfirmation] =
    React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize the form with default values
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      googleDriveLink: "",
      availableSizes: PREDEFINED_SIZES.map((size) => ({
        id: size.id,
        selected: false, // No pre-selected sizes
        price: size.defaultPrice,
        file: null,
      })),
    },
  });

  // Watch for changes in the Google Drive link
  const googleDriveLink = form.watch("googleDriveLink");
  const availableSizes = form.watch("availableSizes");

  // Evaluate image quality based on dimensions
  const evaluateImageQuality = React.useCallback(
    (width: number, height: number, sizeId: string): QualityLevel => {
      const sizeInfo = PREDEFINED_SIZES.find((size) => size.id === sizeId);
      if (!sizeInfo) return "poor";

      const { recommendedWidth, recommendedHeight } = sizeInfo;

      // Calculate percentage of recommended resolution
      const widthPercentage = (width / recommendedWidth) * 100;
      const heightPercentage = (height / recommendedHeight) * 100;

      // Use the lower percentage to determine quality
      const qualityPercentage = Math.min(widthPercentage, heightPercentage);

      if (qualityPercentage >= 95) return "good";
      if (qualityPercentage >= 70) return "medium";
      return "poor";
    },
    []
  );

  // Get quality badge variant and text
  const getQualityInfo = (quality: QualityLevel) => {
    switch (quality) {
      case "good":
        return {
          variant: "success" as const,
          text: "Good",
          description: "Meets or exceeds recommended resolution",
        };
      case "medium":
        return {
          variant: "warning" as const,
          text: "Medium",
          description: "Slightly below recommended resolution",
        };
      case "poor":
        return {
          variant: "destructive" as const,
          text: "Poor",
          description: "Below standard, consider replacing",
        };
      default:
        return {
          variant: "outline" as const,
          text: "Unknown",
          description: "Could not determine quality",
        };
    }
  };

  // Simulate file upload progress
  const simulateUpload = React.useCallback(
    (sizeId: string) => {
      setUploading({ ...uploading, [sizeId]: true });
      setUploadProgress({ ...uploadProgress, [sizeId]: 0 });
      setUploadComplete({ ...uploadComplete, [sizeId]: false });

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploading({ ...uploading, [sizeId]: false });
          setUploadComplete({ ...uploadComplete, [sizeId]: true });
        }
        setUploadProgress((prev) => ({ ...prev, [sizeId]: progress }));
      }, 200);
    },
    [uploading, uploadProgress, uploadComplete]
  );

  // Real file upload function
  const uploadFile = async (file: File, sizeId: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("size", sizeId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  // Upload progress tracking
  const updateProgress = (sizeId: string, progress: number) => {
    setUploadProgress((prev) => ({ ...prev, [sizeId]: progress }));
  };

  // Get image dimensions
  const getImageDimensions = (file: File, sizeId: string) => {
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height };
      setImageDimensions((prev) => ({ ...prev, [sizeId]: dimensions }));

      // Evaluate quality based on dimensions
      const quality = evaluateImageQuality(img.width, img.height, sizeId);
      setImageQuality((prev) => ({ ...prev, [sizeId]: quality }));
    };
    img.src = URL.createObjectURL(file);
  };

  // Handle file selection
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    sizeId: string
  ) => {
    const file = event.target.files?.[0] || null;
    handleFile(file, sizeId);
  };

  // Handle file drop
  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    sizeId: string
  ) => {
    event.preventDefault();
    setIsDragging({ ...isDragging, [sizeId]: false });

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      handleFile(file, sizeId);
    }
  };

  // Common file handling logic
  const handleFile = (file: File | null, sizeId: string) => {
    const newFiles = { ...files, [sizeId]: file };
    setFiles(newFiles);

    // Reset upload states
    setUploadProgress({ ...uploadProgress, [sizeId]: 0 });
    setUploading({ ...uploading, [sizeId]: false });
    setUploadComplete({ ...uploadComplete, [sizeId]: false });

    // Create preview URL and simulate upload
    if (file) {
      // Get image dimensions
      getImageDimensions(file, sizeId);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews({ ...previews, [sizeId]: reader.result as string });
        // We'll simulate upload for the preview, but not actually upload until form submission
        simulateUpload(sizeId);
      };
      reader.readAsDataURL(file);
    } else {
      const newPreviews = { ...previews };
      delete newPreviews[sizeId];
      setPreviews(newPreviews);

      // Clear dimensions and quality
      const newDimensions = { ...imageDimensions };
      delete newDimensions[sizeId];
      setImageDimensions(newDimensions);

      const newQuality = { ...imageQuality };
      delete newQuality[sizeId];
      setImageQuality(newQuality);
    }
  };

  // Handle drag events
  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    sizeId: string
  ) => {
    event.preventDefault();
    setIsDragging({ ...isDragging, [sizeId]: true });
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
    sizeId: string
  ) => {
    event.preventDefault();
    setIsDragging({ ...isDragging, [sizeId]: false });
  };

  // Calculate commission based on price
  const calculateCommission = (price: string) => {
    const numPrice = Number.parseFloat(price) || 0;
    return (numPrice * commissionRate).toFixed(2);
  };

  // Handle price change
  const handlePriceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const newPrice = event.target.value;
    const newSizes = [...form.getValues().availableSizes];
    newSizes[index].price = newPrice;
    form.setValue("availableSizes", newSizes);
  };

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean, index: number) => {
    const newSizes = [...form.getValues().availableSizes];
    newSizes[index].selected = checked;
    form.setValue("availableSizes", newSizes);
  };

  // Remove a file
  const removeFile = (sizeId: string) => {
    const newFiles = { ...files };
    delete newFiles[sizeId];
    setFiles(newFiles);

    const newPreviews = { ...previews };
    delete newPreviews[sizeId];
    setPreviews(newPreviews);

    // Reset upload states
    setUploadProgress({ ...uploadProgress, [sizeId]: 0 });
    setUploading({ ...uploading, [sizeId]: false });
    setUploadComplete({ ...uploadComplete, [sizeId]: false });

    // Clear dimensions and quality
    const newDimensions = { ...imageDimensions };
    delete newDimensions[sizeId];
    setImageDimensions(newDimensions);

    const newQuality = { ...imageQuality };
    delete newQuality[sizeId];
    setImageQuality(newQuality);
  };

  const handleSaveAsDraft = () => {
    setShowDraftConfirmation(true);
  };

  const confirmSaveAsDraft = () => {
    // Here you would implement the actual save as draft functionality
    // For now, we'll just show a success message
    toast.success("Form saved as draft");
    setShowDraftConfirmation(false);

    // Reset the form to default values
    form.reset({
      title: "",
      description: "",
      googleDriveLink: "",
      availableSizes: PREDEFINED_SIZES.map((size) => ({
        id: size.id,
        selected: false,
        price: size.defaultPrice,
        file: null,
      })),
    });

    // Clear files and previews
    setFiles({});
    setPreviews({});
    setUploadProgress({});
    setUploading({});
    setUploadComplete({});
    setImageDimensions({});
    setImageQuality({});
  };

  // Form submission handler
  async function onSubmit(data: UploadFormValues) {
    try {
      // Check if at least one size is selected
      if (!data.availableSizes.some((size) => size.selected)) {
        toast.error("Please select at least one size for your poster");
        return;
      }

      // Check if files are uploaded when needed
      if (!data.googleDriveLink) {
        const selectedSizes = data.availableSizes.filter(
          (size) => size.selected
        );
        const missingFiles = selectedSizes.some((size) => !files[size.id]);

        if (missingFiles) {
          toast.error(
            "Please upload files for all selected sizes or provide a Google Drive link"
          );
          return;
        }

        // Check for poor quality images
        const poorQualityImages = selectedSizes.some(
          (size) => imageQuality[size.id] === "poor"
        );
        if (poorQualityImages) {
          const confirmUpload = window.confirm(
            "Some of your images have poor resolution for print. Do you still want to continue?"
          );
          if (!confirmUpload) return;
        }
      }

      setIsSubmitting(true);

      // Show loading toast
      const loadingToast = toast.loading("Uploading poster...");

      try {
        const selectedSizes = data.availableSizes
          .filter((size) => size.selected)
          .map((size) => size.id);

        // Prepare pricing data
        const prices: Record<string, string> = {};
        data.availableSizes
          .filter((size) => size.selected)
          .forEach((size) => {
            prices[size.id] = size.price;
          });

        // Upload files and get URLs
        const imageUrls: Record<string, string> = {};

        // Only upload files if no Google Drive link is provided
        if (!data.googleDriveLink) {
          // Upload each file
          const uploadPromises = data.availableSizes
            .filter((size) => size.selected && files[size.id])
            .map(async (size) => {
              setUploading((prev) => ({ ...prev, [size.id]: true }));
              try {
                const url = await uploadFile(files[size.id]!, size.id);
                imageUrls[size.id] = url;
                setUploadComplete((prev) => ({ ...prev, [size.id]: true }));
                return url;
              } catch (error) {
                toast.error(`Failed to upload file for size ${size.id}`);
                throw error;
              } finally {
                setUploading((prev) => ({ ...prev, [size.id]: false }));
              }
            });

          await Promise.all(uploadPromises);
        }

        // Prepare form data for submission
        const formData = {
          title: data.title,
          description: data.description,
          driveLink: data.googleDriveLink || null,
          selectedSizes,
          prices,
          imageUrls,
        };

        // Submit to Supabase using server action
        const result = await submitPoster(formData);

        if (!result.success) {
          toast.dismiss(loadingToast);
          toast.error(
            result.error || "Failed to upload poster. Please try again."
          );
          return;
        }

        toast.dismiss(loadingToast);
        toast.success("Poster uploaded successfully!");

        // Reset form and state
        form.reset({
          title: "",
          description: "",
          googleDriveLink: "",
          availableSizes: PREDEFINED_SIZES.map((size) => ({
            id: size.id,
            selected: false,
            price: size.defaultPrice,
            file: null,
          })),
        });

        // Clear files and previews
        setFiles({});
        setPreviews({});
        setUploadProgress({});
        setUploading({});
        setUploadComplete({});
        setImageDimensions({});
        setImageQuality({});

        // Navigate to dashboard
        router.push("/dashboard");
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.dismiss(loadingToast);
        toast.error("Failed to upload poster. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  // Get recommended resolution text for a size
  const getRecommendedResolution = (sizeId: string) => {
    const size = PREDEFINED_SIZES.find((s) => s.id === sizeId);
    if (!size) return "";
    return `${size.recommendedWidth} × ${size.recommendedHeight} px`;
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Upload New Poster</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="googleDriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Drive Link (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        If you have your artwork in Google Drive, paste the link
                        here. This will eliminate the need to upload individual
                        files.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poster Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter poster title" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be displayed as the product name in the shop.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poster Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter poster description"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed description of your poster.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-2">
                    Available Sizes & Pricing
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which sizes will be available for your poster and set
                    pricing. Commission is calculated at {commissionRate * 100}
                    %.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Available</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="w-[150px]">Price (£)</TableHead>
                        <TableHead className="w-[200px] relative">
                          <div className="flex justify-between items-center">
                            <span>Commission (£)</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Commission is indicative. Prices may slightly
                                  vary depending on the buyer's local currency
                                  and exchange rates.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableSizes.map((size, index) => (
                        <TableRow key={size.id}>
                          <TableCell>
                            <Checkbox
                              checked={size.selected}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(!!checked, index)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Label
                              htmlFor={`price-${size.id}`}
                              className="font-normal"
                            >
                              {
                                PREDEFINED_SIZES.find((s) => s.id === size.id)
                                  ?.label
                              }
                            </Label>
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                                £
                              </span>
                              <Input
                                id={`price-${size.id}`}
                                value={size.price}
                                onChange={(e) => handlePriceChange(e, index)}
                                className="pl-7"
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!size.selected}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                                £
                              </span>
                              <Input
                                value={calculateCommission(size.price)}
                                readOnly
                                className="pl-7 bg-muted/50"
                                disabled={!size.selected}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <AlertCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle>Recommended Image Quality</AlertTitle>
                  <AlertDescription>
                    Please ensure your uploads are high-resolution, print-ready
                    formats (300 DPI) to guarantee the best print quality. Each
                    poster size has specific recommended pixel dimensions.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Only show upload section if Google Drive link is not provided */}
          {!googleDriveLink ? (
            <>
              <Separator className="my-6" />

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        Upload Print Files
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload high-resolution files for each selected size. The
                        system will check if your image meets the recommended
                        resolution.
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {availableSizes
                        .filter((size) => size.selected)
                        .map((size) => {
                          const sizeInfo = PREDEFINED_SIZES.find(
                            (s) => s.id === size.id
                          );
                          return (
                            <div key={size.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Label>
                                  {
                                    PREDEFINED_SIZES.find(
                                      (s) => s.id === size.id
                                    )?.label
                                  }
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  Recommended:{" "}
                                  {getRecommendedResolution(size.id)}
                                </span>
                              </div>
                              <div
                                className={`border-2 border-dashed rounded-md p-4 transition-colors ${
                                  isDragging[size.id]
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                } ${
                                  previews[size.id] ? "border-primary/50" : ""
                                }`}
                                onDragOver={(e) => handleDragOver(e, size.id)}
                                onDragLeave={(e) => handleDragLeave(e, size.id)}
                                onDrop={(e) => handleDrop(e, size.id)}
                              >
                                {previews[size.id] ? (
                                  <div className="relative">
                                    <img
                                      src={
                                        previews[size.id] || "/placeholder.svg"
                                      }
                                      alt="Preview"
                                      className="h-24 w-auto mx-auto object-contain rounded-md"
                                    />

                                    {/* Upload progress indicator */}
                                    {uploading[size.id] && (
                                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-md text-white">
                                        <div className="w-3/4 mb-2">
                                          <Progress
                                            value={uploadProgress[size.id]}
                                            className="h-2"
                                          />
                                        </div>
                                        <p className="text-xs font-medium">
                                          {Math.round(uploadProgress[size.id])}%
                                        </p>
                                      </div>
                                    )}

                                    {/* Upload complete indicator */}
                                    {uploadComplete[size.id] &&
                                      !uploading[size.id] && (
                                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                          <CheckIcon className="h-4 w-4" />
                                        </div>
                                      )}

                                    {/* Image quality indicator */}
                                    {imageDimensions[size.id] &&
                                      uploadComplete[size.id] &&
                                      !uploading[size.id] && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 rounded-b-md">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-white">
                                                {imageDimensions[size.id].width}{" "}
                                                ×{" "}
                                                {
                                                  imageDimensions[size.id]
                                                    .height
                                                }{" "}
                                                px
                                              </span>
                                              <Badge
                                                variant={
                                                  getQualityInfo(
                                                    imageQuality[size.id]
                                                  ).variant
                                                }
                                                className="text-xs"
                                              >
                                                {
                                                  getQualityInfo(
                                                    imageQuality[size.id]
                                                  ).text
                                                }
                                              </Badge>
                                            </div>
                                            <p className="text-xs text-white/80">
                                              {
                                                getQualityInfo(
                                                  imageQuality[size.id]
                                                ).description
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute -top-2 -right-2 h-6 w-6"
                                      onClick={() => removeFile(size.id)}
                                      disabled={uploading[size.id]}
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      Drag & drop or click to upload
                                    </p>
                                    <Label
                                      htmlFor={`file-upload-${size.id}`}
                                      className="sr-only"
                                    >
                                      Upload file
                                    </Label>
                                    <Input
                                      id={`file-upload-${size.id}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleFileChange(e, size.id)
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `file-upload-${size.id}`
                                          )
                                          ?.click()
                                      }
                                    >
                                      <UploadIcon className="mr-2 h-4 w-4" />
                                      Select File
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {availableSizes.filter((size) => size.selected).length ===
                      0 && (
                      <div className="text-center p-6 border border-dashed rounded-md">
                        <InfoIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">
                          Please select at least one size above to upload files
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert className="mt-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <InfoIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Google Drive Link Provided</AlertTitle>
              <AlertDescription>
                Since you've provided a Google Drive link, individual file
                uploads are not required. We'll use the files from your Drive
                link for all selected sizes.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleSaveAsDraft}>
              Discard Changes
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Upload Poster
            </Button>
          </div>
          <Dialog
            open={showDraftConfirmation}
            onOpenChange={setShowDraftConfirmation}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Are you sure you want to clear the form?
                </DialogTitle>
                <DialogDescription>
                  This will discard all entered information and reset the form.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDraftConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmSaveAsDraft}>
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  );
}
