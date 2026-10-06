import { NextRequest, NextResponse } from "next/server";
import { campaignsRootDestination } from "./modules/campaigns/lib/host-routing";

export function middleware(request: NextRequest) {
  const destination = campaignsRootDestination({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  }, {
    CAMPAIGNS_HOST_ROUTING: process.env.CAMPAIGNS_HOST_ROUTING,
    CAMPAIGNS_APP_ORIGIN: process.env.CAMPAIGNS_APP_ORIGIN,
    CAMPAIGNS_ROUTING_BACKEND_HOSTS: process.env.CAMPAIGNS_ROUTING_BACKEND_HOSTS,
  });
  if (!destination) return NextResponse.next();
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/"] };
