import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") redirect("/login");

  const requestHeaders = await headers();
  const accessEmail = requestHeaders.get("cf-access-authenticated-user-email")?.toLowerCase();
  const accessRequired = process.env.CLOUDFLARE_ACCESS_REQUIRED === "true" || process.env.NODE_ENV === "production";
  if (accessRequired && accessEmail !== session.user.email.toLowerCase()) redirect("/login?error=AccessRequired");

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8 min-w-0">{children}</main>
    </div>
  );
}
