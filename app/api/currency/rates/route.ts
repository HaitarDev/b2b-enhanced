import { NextResponse } from "next/server";
import axios from "axios";
import { SupportedCurrency } from "@/lib/currency";

// Define the response structure
interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

// Cache for exchange rates
let exchangeRatesCache: {
  timestamp: number;
  rates: Record<SupportedCurrency, Record<SupportedCurrency, number>>;
} | null = null;

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

// Define default fallback rates in case API is unavailable
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

export async function GET() {
  try {
    // Check if we have valid cached rates
    if (
      exchangeRatesCache &&
      Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION
    ) {
      return NextResponse.json(exchangeRatesCache.rates);
    }

    // Initialize rates object
    const allRates: Record<
      SupportedCurrency,
      Record<SupportedCurrency, number>
    > = {
      GBP: { GBP: 1, EUR: 0, USD: 0, DKK: 0 },
      EUR: { GBP: 0, EUR: 1, USD: 0, DKK: 0 },
      USD: { GBP: 0, EUR: 0, USD: 1, DKK: 0 },
      DKK: { GBP: 0, EUR: 0, USD: 0, DKK: 1 },
    };

    // Fetch rates for each base currency
    const supportedCurrencies: SupportedCurrency[] = [
      "GBP",
      "EUR",
      "USD",
      "DKK",
    ];

    for (const baseCurrency of supportedCurrencies) {
      const response = await axios.get<ExchangeRateResponse>(
        `https://api.exchangerate.host/latest?base=${baseCurrency}`
      );

      if (response.data && response.data.rates) {
        // Fill in the rates for all target currencies
        for (const targetCurrency of supportedCurrencies) {
          allRates[baseCurrency][targetCurrency] =
            response.data.rates[targetCurrency] ||
            defaultExchangeRates[baseCurrency][targetCurrency];
        }
      }
    }

    // Update cache
    exchangeRatesCache = {
      timestamp: Date.now(),
      rates: allRates,
    };

    return NextResponse.json(allRates);
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Return default rates as fallback
    return NextResponse.json(defaultExchangeRates);
  }
}
