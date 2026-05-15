import { NextResponse } from "next/server";
import { getLiveForexRate } from "@/lib/forex";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const forex = await getLiveForexRate();
  return NextResponse.json(forex, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
