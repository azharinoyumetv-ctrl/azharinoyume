import { Suspense } from "react";
import OrderForm from "@/components/order/OrderForm";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4"><div className="text-muted-foreground">Loading order form...</div></div>}>
      <OrderForm />
    </Suspense>
  );
}
