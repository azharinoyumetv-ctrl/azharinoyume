import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host === "azcutai.azharinoyume.cloud") {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    destination.host = "studio.azharinoyume.cloud";
    destination.port = "";
    return NextResponse.redirect(destination, 308);
  }
  if (
    host === "bot.azharinoyume.cloud" &&
    (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/en")
  ) {
    return NextResponse.redirect(
      new URL("/admin/opportunities", request.url),
      307,
    );
  }

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const hasLocalePrefix = routing.locales.some((locale) => locale === segments[0]);
  const locale = hasLocalePrefix ? segments[0] : routing.defaultLocale;
  const section = segments[hasLocalePrefix ? 1 : 0];
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const isAdminRoute = section === "admin";
  const isPortalRoute = section === "portal";

  if (isAdminRoute || isPortalRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminRoute && token.role !== "admin") {
      return NextResponse.redirect(new URL(`${localePrefix}/portal`, request.url));
    }
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
