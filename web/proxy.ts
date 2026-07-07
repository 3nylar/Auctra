import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Bidding and listing items are on-chain actions that need a connected
// wallet, so /create and /dashboard require sign-in. Browsing auctions
// (/auctions and /auctions/[id]) stays public -- there's real value in
// letting people watch a live auction before committing to sign in.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/create") || req.nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/create/:path*", "/dashboard/:path*"],
};
