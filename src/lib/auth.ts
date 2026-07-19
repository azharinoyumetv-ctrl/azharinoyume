import type { NextAuthOptions } from "next-auth";
import EmailProviderModule from "next-auth/providers/email";
import CredentialsProviderModule from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  clearPasswordLoginFailures,
  isPasswordLoginRateLimited,
  parseLoginCredentials,
  recordPasswordLoginFailure,
  verifyPasswordHash,
} from "@/lib/auth/password";

const EmailProvider = ((EmailProviderModule as unknown as { default?: typeof EmailProviderModule }).default || EmailProviderModule) as typeof EmailProviderModule;
const CredentialsProvider = ((CredentialsProviderModule as unknown as { default?: typeof CredentialsProviderModule }).default || CredentialsProviderModule) as typeof CredentialsProviderModule;

declare module "next-auth" {
  interface User { id: string; role: string; }
  interface Session { user: { id: string; email: string; name: string; role: string; } }
}

declare module "next-auth/jwt" {
  interface JWT { id: string; role: string; }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as never),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email", autoComplete: "email" },
        password: { label: "Password", type: "password", autoComplete: "current-password" },
      },
      async authorize(credentials, request) {
        const parsed = parseLoginCredentials(credentials);
        if (!parsed) return null;

        const forwardedFor = request.headers?.["cf-connecting-ip"] || request.headers?.["x-forwarded-for"] || "unknown";
        const clientAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0].trim();
        const rateLimitKey = `${clientAddress}:${parsed.email}`;
        if (isPasswordLoginRateLimited(rateLimitKey)) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.email } });
        const passwordMatches = await verifyPasswordHash(parsed.password, user?.passwordHash);
        if (!user || !passwordMatches) {
          recordPasswordLoginFailure(rateLimitKey);
          return null;
        }

        clearPasswordLoginFailures(rateLimitKey);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM || "noreply@azharinoyume.cloud",
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url, provider }) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error("RESEND_API_KEY is required to send magic links");
        const resend = new Resend(apiKey);
        const host = new URL(url).host;
        const result = await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: `Sign in to Azyume Cut AI`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#0a0a0f;color:#fff"><h1 style="color:#d4a017">Your secure sign-in link</h1><p>This link signs you in to ${host} and expires in 15 minutes.</p><p><a href="${url}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#d4a017;color:#000;text-decoration:none;font-weight:700">Sign in to Azyume Cut AI</a></p><p style="color:#999;font-size:12px">If you did not request this email, you can ignore it.</p></div>`,
          text: `Sign in to Azyume Cut AI: ${url}\n\nThis link expires in 15 minutes.`,
        });
        if (result.error) throw new Error(result.error.message);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      } else if (token.email && (!token.id || !token.role)) {
        const current = await prisma.user.findUnique({ where: { email: token.email } });
        if (current) {
          token.id = current.id;
          token.role = current.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.wallet.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
      }
    },
  },
};
