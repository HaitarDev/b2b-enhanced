/**
 * Format a number as currency
 * @param value The number to format as currency
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a date
 * @param date The date to format
 * @param format The format to use (default: short)
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date,
  format: "short" | "long" = "short"
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);

  const options: Intl.DateTimeFormatOptions =
    format === "short"
      ? { year: "numeric", month: "short", day: "numeric" }
      : {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };

  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
};
