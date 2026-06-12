import { Suspense } from "react";
import OrderForm from "@/components/order/OrderForm";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-muted-foreground">Loading order form...</div></div>}>
      <OrderForm />
    </Suspense>
  );
}
