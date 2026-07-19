import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.includes("/admin") || pathname.includes("/portal")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const locale = pathname.split("/")[1] || routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.includes("/admin") && token.role !== "admin") {
      return NextResponse.redirect(new URL(`/${pathname.split("/")[1] || routing.defaultLocale}/portal`, request.url));
    }
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
