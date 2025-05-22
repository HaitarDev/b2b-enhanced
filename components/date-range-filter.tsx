"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
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

// Update the DateRangeOption type to remove "all" option
export type DateRangeOption =
  | "7d"
  | "30d"
  | "90d"
  | "180d"
  | "this_month"
  | "custom";

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DateRangeFilterProps {
  onRangeChange?: (range: DateRange) => void;
  defaultValues?: DateRange;
  currentOption?: DateRangeOption;
}

export function DateRangeFilter({
  onRangeChange,
  defaultValues,
  currentOption = "this_month",
}: DateRangeFilterProps) {
  const [selectedOption, setSelectedOption] =
    React.useState<DateRangeOption>(currentOption);
  const [dateRange, setDateRange] = React.useState<DateRange>(
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
    if (currentOption) {
      setSelectedOption(currentOption);
    }
  }, [currentOption]);

  // Handle custom date range selection
  const handleDateRangeSelect = (range: DateRange) => {
    if (range.from || range.to) {
      setDateRange(range);
      setSelectedOption("custom");
      if (range.from && range.to) {
        setIsCalendarOpen(false);
        if (onRangeChange) {
          onRangeChange(range);
        }
      }
    }
  };

  // Handle option selection in dropdown
  const handleOptionSelect = (value: string) => {
    const option = value as DateRangeOption;
    setSelectedOption(option);
    setIsDropdownOpen(false);

    // For custom, open the calendar and let user select dates
    if (option === "custom") {
      setIsCalendarOpen(true);
      return;
    }

    // Otherwise, close the calendar if it's open
    setIsCalendarOpen(false);

    // Call onRangeChange with the appropriate date range
    if (onRangeChange) {
      const now = new Date();
      let range: DateRange = { from: undefined, to: undefined };

      switch (option) {
        case "7d":
          range = {
            from: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 7
            ),
            to: now,
          };
          break;
        case "30d":
          range = {
            from: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 30
            ),
            to: now,
          };
          break;
        case "90d":
          range = {
            from: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 90
            ),
            to: now,
          };
          break;
        case "180d":
          // Use exact 6 months (180 days is not always 6 months)
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          range = {
            from: sixMonthsAgo,
            to: now,
          };
          break;
        case "this_month":
          // Ensure this is precisely the 1st day of the current month
          range = {
            from: new Date(now.getFullYear(), now.getMonth(), 1),
            to: now,
          };
          break;
      }

      setDateRange(range);
      onRangeChange(range);
    }
  };

  // Format the date range for display
  const formatDateRange = () => {
    if (selectedOption !== "custom") {
      const labels: Record<DateRangeOption, string> = {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "90d": "Last 90 days",
        "180d": "Last 6 months",
        this_month: "This Month",
        custom: "Custom Range",
      };
      return labels[selectedOption];
    }

    if (
      dateRange.from &&
      dateRange.to &&
      isValid(dateRange.from) &&
      isValid(dateRange.to)
    ) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(
        dateRange.to,
        "MMM d, yyyy"
      )}`;
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
            <DropdownMenuRadioItem value="7d">
              Last 7 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="30d">
              Last 30 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="90d">
              Last 90 days
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="180d">
              Last 6 months
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="this_month">
              This Month
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
