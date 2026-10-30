import { NextResponse } from "next/server";
import { fetchExchangeRates } from "@/lib/exchange-rates";

export async function GET() {
  try {
    return NextResponse.json(await fetchExchangeRates(), {
      headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("GET /api/exchange-rates failed", error);
    return NextResponse.json({ error: "Live exchange rates are temporarily unavailable." }, { status: 503 });
  }
}
