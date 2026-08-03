import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { isFeatureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const show360 = await isFeatureEnabled("r_and_d_360_video");
  return (
    <>
      <Navbar show360={show360} />
      <main className="public-main">{children}</main>
      <Footer />
    </>
  );
}
