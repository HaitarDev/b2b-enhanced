"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DashboardFilter } from "@/hooks/use-dashboard-data";

export type OrdersDateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface OrdersDateRangePickerProps {
  onRangeChange?: (range: OrdersDateRange) => void;
  onTimeRangeChange?: (timeRange: DashboardFilter) => void;
  defaultValues?: OrdersDateRange;
  currentTimeRange?: DashboardFilter;
}

export function OrdersDateRangePicker({
  onRangeChange,
  onTimeRangeChange,
  defaultValues,
  currentTimeRange = "this_month",
}: OrdersDateRangePickerProps) {
  const [selectedOption, setSelectedOption] =
    React.useState<DashboardFilter>(currentTimeRange);
  const [dateRange, setDateRange] = React.useState<OrdersDateRange>(
    defaultValues || {
      from: undefined,
      to: undefined,
    }
  );
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  // Update state when props change
  React.useEffect(() => {
    if (defaultValues) {
      setDateRange(defaultValues);
    }
  }, [defaultValues]);

  React.useEffect(() => {
    if (currentTimeRange) {
      setSelectedOption(currentTimeRange);
    }
  }, [currentTimeRange]);

  // Handle custom date range selection
  const handleDateRangeSelect = (range: OrdersDateRange) => {
    if (range.from || range.to) {
      setDateRange(range);
      setSelectedOption("custom");
      if (range.from && range.to) {
        setIsCalendarOpen(false);
        if (onRangeChange) {
          onRangeChange(range);
        }
        if (onTimeRangeChange) {
          onTimeRangeChange("custom");
        }
      }
    }
  };

  // Handle option selection in dropdown
  const handleOptionSelect = (value: string) => {
    const option = value as DashboardFilter;
    setSelectedOption(option);
    setIsDropdownOpen(false);

    // For custom, open the calendar and let user select dates
    if (option === "custom") {
      setIsCalendarOpen(true);
      return;
    }

    // Otherwise, close the calendar if it's open
    setIsCalendarOpen(false);

    // Call onTimeRangeChange to let the parent handle the date range calculation
    if (onTimeRangeChange) {
      onTimeRangeChange(option);
    }
  };

  // Format the date range for display
  const formatDateRange = () => {
    if (selectedOption !== "custom") {
      const labels: Record<DashboardFilter, string> = {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "90d": "Last 90 days",
        this_month: "This Month",
        custom: "Custom Range",
      };
      return labels[selectedOption];
    }

    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(
        dateRange.to,
        "MMM d, yyyy"
      )}`;
    }

    if (dateRange.from && !dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - Select end date`;
    }

    return "Select date range";
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-1 px-3">
            <span className="max-w-[140px] truncate">{formatDateRange()}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto p-2" align="start" side="bottom">
          <DropdownMenuRadioGroup
            value={selectedOption}
            onValueChange={handleOptionSelect}
          >
            <DropdownMenuRadioItem value="this_month">
              This Month
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="7d">
              Last 7 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="30d">
              Last 30 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="90d">
              Last 90 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="custom">
              Custom Range
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-3">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{
              from: dateRange.from,
              to: dateRange.to,
            }}
            onSelect={(range) => {
              if (range) {
                handleDateRangeSelect({
                  from: range.from,
                  to: range.to,
                });
              } else {
                handleDateRangeSelect({ from: undefined, to: undefined });
              }
            }}
            numberOfMonths={2}
            className="rounded-md border shadow"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
