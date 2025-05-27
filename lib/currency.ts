import axios from "axios";

export type SupportedCurrency = "GBP" | "EUR" | "USD" | "DKK";

export const currencySymbols: Record<SupportedCurrency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  DKK: "kr",
};

// Default exchange rates as fallback (approximate as of May 2024)
const defaultExchangeRates: Record<
  SupportedCurrency,
  Record<SupportedCurrency, number>
> = {
  GBP: {
    GBP: 1.0,
    EUR: 1.17,
    USD: 1.28,
    DKK: 8.72,
  },
  EUR: {
    GBP: 0.85,
    EUR: 1.0,
    USD: 1.09,
    DKK: 7.46,
  },
  USD: {
    GBP: 0.78,
    EUR: 0.92,
    USD: 1.0,
    DKK: 6.84,
  },
  DKK: {
    GBP: 0.11,
    EUR: 0.13,
    USD: 0.15,
    DKK: 1.0,
  },
};

// Cache for exchange rates
let exchangeRatesCache: {
  timestamp: number;
  rates: Record<SupportedCurrency, Record<SupportedCurrency, number>>;
} | null = null;

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;

export async function getExchangeRates(): Promise<
  Record<SupportedCurrency, Record<SupportedCurrency, number>>
> {
  // Check if we have valid cached rates
  if (
    exchangeRatesCache &&
    Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION
  ) {
    return exchangeRatesCache.rates;
  }

  try {
    // Use our API endpoint to get rates - this endpoint internally caches rates for 1 hour
    const response = await axios.get("/api/currency/rates");

    if (response.data) {
      // Update local cache
      exchangeRatesCache = {
        timestamp: Date.now(),
        rates: response.data,
      };

      return response.data;
    }

    throw new Error("Invalid response from exchange rate API");
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Return default rates as fallback
    return defaultExchangeRates;
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency = "GBP",
  toCurrency: SupportedCurrency
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  try {
    const rates = await getExchangeRates();
    const rate = rates[fromCurrency][toCurrency];

    if (!rate) return amount * defaultExchangeRates[fromCurrency][toCurrency];

    return amount * rate;
  } catch (error) {
    console.error("Error converting currency:", error);
    // Use default rates as fallback
    return amount * defaultExchangeRates[fromCurrency][toCurrency];
  }
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency
): string {
  // Use the defined symbols instead of letting Intl.NumberFormat add the currency code
  const symbol = currencySymbols[currency];

  // Format the number with the correct decimal places
  const formattedNumber = new Intl.NumberFormat("en-GB", {
    style: "decimal", // Use decimal instead of currency
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Return with the appropriate symbol
  return `${symbol}${formattedNumber}`;
}
