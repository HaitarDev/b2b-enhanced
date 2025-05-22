import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all protected routes:
     * - /admin/* (admin routes) except /admin/login
     * - /dashboard/* (creator routes)
     * Exclude static files and api routes
     */
    "/admin/:path((?!login).*)",
    "/dashboard/:path*",
  ],
};
