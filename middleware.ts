// middleware.ts — Edge middleware for logging and CORS
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/api/v1/:path*"],
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Log API requests (server-side only)
  const method = request.method;
  const path = request.nextUrl.pathname;
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${method} ${path} — Origin: ${origin || "direct"}`);

  return NextResponse.next();
}
