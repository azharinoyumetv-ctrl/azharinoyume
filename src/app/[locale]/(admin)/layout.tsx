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
    <div className="dashboard-backdrop flex min-h-[100dvh] bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 px-3 pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 min-[900px]:ml-72 min-[900px]:p-7 min-[1200px]:p-9">{children}</main>
    </div>
  );
}
