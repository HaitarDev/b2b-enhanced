import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  onDateRangeChange: (
    startDate: Date | undefined,
    endDate: Date | undefined,
    presetName?: string
  ) => void;
  defaultSelectedRange?: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export function DateRangePicker({
  onDateRangeChange,
  defaultSelectedRange = "this-month",
  initialStartDate,
  initialEndDate,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate
  );
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Determine initial preset from provided dates
  const determineInitialPreset = (): string => {
    // If no initial dates, use default
    if (!initialStartDate) return defaultSelectedRange;

    // Identify common presets
    const now = new Date();
    const dayDiff = Math.round(
      (now.getTime() - initialStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 7) return "7days";
    if (dayDiff === 30) return "30days";
    if (dayDiff === 90) return "90days";
    if (dayDiff >= 175 && dayDiff <= 185) return "6months"; // Approx 6 months

    // Check if it's the current month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    if (
      initialStartDate.getMonth() === currentMonth &&
      initialStartDate.getFullYear() === currentYear &&
      initialEndDate?.getMonth() === currentMonth &&
      initialEndDate?.getFullYear() === currentYear
    ) {
      return "this-month";
    }

    // If no match and we have custom dates, use custom
    return "custom";
  };

  const [selectedPreset, setSelectedPreset] = useState<string>(
    determineInitialPreset()
  );

  // Apply the default range on initial load, but only if no initial dates were provided
  useEffect(() => {
    if (!initialStartDate && !initialEndDate) {
      handlePresetChange(defaultSelectedRange);
    }
  }, [defaultSelectedRange, initialStartDate, initialEndDate]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(undefined);
      setSelectedPreset("custom");
    } else if (date && date >= startDate) {
      setEndDate(date);
      setIsCalendarOpen(false);
      if (typeof onDateRangeChange === "function") {
        onDateRangeChange(startDate, date, "custom");
      } else {
        console.error("onDateRangeChange is not a function");
      }
    } else {
      setStartDate(date);
      setEndDate(undefined);
      setSelectedPreset("custom");
    }
  };

  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPreset("this-month");
    if (typeof onDateRangeChange === "function") {
      onDateRangeChange(undefined, undefined, "this-month");
    } else {
      console.error("onDateRangeChange is not a function");
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);

    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined = now;

    switch (value) {
      case "7days":
        start = new Date();
        start.setDate(now.getDate() - 7);
        break;
      case "30days":
        start = new Date();
        start.setDate(now.getDate() - 30);
        break;
      case "90days":
        start = new Date();
        start.setDate(now.getDate() - 90);
        break;
      case "6months":
        start = new Date();
        start.setMonth(now.getMonth() - 6);
        break;
      case "this-month":
        // For this month, set to first day of current month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        break;
      case "custom":
        setIsCalendarOpen(true);
        return;
      default:
        start = undefined;
        end = undefined;
    }

    setStartDate(start);
    setEndDate(end);
    if (typeof onDateRangeChange === "function") {
      onDateRangeChange(start, end, value);
    } else {
      console.error("onDateRangeChange is not a function");
    }
  };

  const getDateRangeText = () => {
    if (selectedPreset === "this-month") {
      return "This Month";
    }

    if (!startDate) {
      return "Select date range";
    }

    if (startDate && !endDate) {
      return `${format(startDate, "MMM dd, yyyy")} - Select end date`;
    }

    if (startDate && endDate) {
      return `${format(startDate, "MMM dd, yyyy")} - ${format(
        endDate,
        "MMM dd, yyyy"
      )}`;
    }

    return "Select date range";
  };

  return (
    <div className="flex items-center space-x-2">
      <Select onValueChange={handlePresetChange} value={selectedPreset}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">Last 7 days</SelectItem>
          <SelectItem value="30days">Last 30 days</SelectItem>
          <SelectItem value="90days">Last 90 days</SelectItem>
          <SelectItem value="6months">Last 6 months</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[210px] justify-start text-left font-normal",
              !startDate &&
                selectedPreset !== "this-month" &&
                "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDateRangeText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate || startDate}
            onSelect={handleCalendarSelect}
            initialFocus
            className="pointer-events-auto"
          />
          <div className="p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleClearDates}
            >
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
