// app/api/v1/health/route.ts — Health check endpoint (no auth required)
import { NextRequest } from "next/server";
import { corsHeaders, getOriginFromRequest } from "@/lib/auth";

export async function OPTIONS(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      model: process.env.AI_MODEL || "gpt-4o-mini",
    }),
    {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    }
  );
}
