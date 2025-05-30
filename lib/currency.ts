import axios, { AxiosResponse } from "axios";

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

// Keep track of in-flight requests to prevent multiple simultaneous requests
let ratesRequestInProgress: Promise<
  Record<SupportedCurrency, Record<SupportedCurrency, number>>
> | null = null;

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;

// Promise with timeout helper
const promiseWithTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
};

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

  // If there's already a request in progress, reuse it
  if (ratesRequestInProgress) {
    try {
      return await promiseWithTimeout(
        ratesRequestInProgress,
        1500, // 1.5 second timeout
        defaultExchangeRates
      );
    } catch (error) {
      console.error(
        "Error waiting for in-flight exchange rates request:",
        error
      );
      return defaultExchangeRates;
    }
  }

  // Create a new request
  try {
    // Create a promise that will be resolved with the exchange rates
    const requestPromise = (async () => {
      try {
        // Use our API endpoint to get rates - this endpoint internally caches rates for 1 hour
        const response = await promiseWithTimeout<AxiosResponse<any>>(
          axios.get("/api/currency/rates"),
          2000, // 2 second timeout
          {
            data: defaultExchangeRates,
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any,
          }
        );

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
      } finally {
        // Clear the in-flight request
        ratesRequestInProgress = null;
      }
    })();

    // Store the in-flight request
    ratesRequestInProgress = requestPromise;

    // Return the result with a timeout
    return await promiseWithTimeout(
      requestPromise,
      2000, // 2 second timeout
      defaultExchangeRates
    );
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Clear the in-flight request
    ratesRequestInProgress = null;
    // Return default rates as fallback
    return defaultExchangeRates;
  }
}

// Add a conversion cache to avoid re-converting the same amounts repeatedly
const conversionCache = new Map<string, { timestamp: number; value: number }>();

export async function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency = "GBP",
  toCurrency: SupportedCurrency
): Promise<number> {
  // Quick return for same currency to avoid unnecessary processing
  if (fromCurrency === toCurrency) return amount;

  // Round amount to 2 decimal places for caching purposes
  const roundedAmount = Math.round(amount * 100) / 100;

  // Create a cache key
  const cacheKey = `${roundedAmount}_${fromCurrency}_${toCurrency}`;

  // Check if we have a recent cached conversion
  const cached = conversionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  // Use existing exchange rates cache if available to make updates immediate
  if (
    exchangeRatesCache &&
    Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION
  ) {
    const rate = exchangeRatesCache.rates[fromCurrency][toCurrency];
    if (rate) {
      const result = roundedAmount * rate;
      // Cache the result
      conversionCache.set(cacheKey, { timestamp: Date.now(), value: result });
      return result;
    }
  }

  try {
    // Create a promise for the conversion with a short timeout
    const conversionPromise = (async () => {
      try {
        // Wrap the rates fetch with a timeout to prevent hanging
        const rates = await getExchangeRates();
        const rate = rates[fromCurrency][toCurrency];

        if (!rate) {
          return roundedAmount * defaultExchangeRates[fromCurrency][toCurrency];
        }

        return roundedAmount * rate;
      } catch (error) {
        console.error("Error in conversion process:", error);
        return roundedAmount * defaultExchangeRates[fromCurrency][toCurrency];
      }
    })();

    // Execute with timeout
    const result = await promiseWithTimeout(
      conversionPromise,
      1000, // 1 second timeout
      roundedAmount * defaultExchangeRates[fromCurrency][toCurrency]
    );

    // Cache the result
    conversionCache.set(cacheKey, { timestamp: Date.now(), value: result });

    return result;
  } catch (error) {
    console.error("Error converting currency:", error);
    // Use default rates as fallback
    const fallbackResult =
      roundedAmount * defaultExchangeRates[fromCurrency][toCurrency];

    // Even cache the fallback result to prevent repeated failures
    conversionCache.set(cacheKey, {
      timestamp: Date.now(),
      value: fallbackResult,
    });

    return fallbackResult;
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
