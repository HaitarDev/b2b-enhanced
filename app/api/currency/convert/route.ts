import { NextRequest, NextResponse } from "next/server";
import { convertCurrency, SupportedCurrency } from "@/lib/currency";

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const amount = parseFloat(searchParams.get("amount") || "0");
  const from = (searchParams.get("from") as SupportedCurrency) || "GBP";
  const to = (searchParams.get("to") as SupportedCurrency) || "GBP";

  // Validate parameters
  if (isNaN(amount)) {
    return NextResponse.json(
      { error: "Invalid amount parameter" },
      { status: 400 }
    );
  }

  if (!["GBP", "EUR", "USD", "DKK"].includes(from)) {
    return NextResponse.json(
      { error: "Invalid source currency" },
      { status: 400 }
    );
  }

  if (!["GBP", "EUR", "USD", "DKK"].includes(to)) {
    return NextResponse.json(
      { error: "Invalid target currency" },
      { status: 400 }
    );
  }

  try {
    // Convert the amount using our utility
    const convertedAmount = await convertCurrency(amount, from, to);

    return NextResponse.json({
      original: {
        amount,
        currency: from,
      },
      converted: {
        amount: convertedAmount,
        currency: to,
      },
      rate: convertedAmount / amount,
    });
  } catch (error) {
    console.error("Error converting currency:", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}
