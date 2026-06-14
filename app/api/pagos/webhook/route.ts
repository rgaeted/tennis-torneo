import { payment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(body.data.id);

  let mpPayment;
  try {
    mpPayment = await payment.get({ id: paymentId });
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const inscripcionId = mpPayment.external_reference;
  const status = mpPayment.status;

  if (!inscripcionId) {
    return NextResponse.json({ ok: true });
  }

  const estadoPago =
    status === "approved" ? "pagado" :
    status === "rejected" ? "rechazado" :
    "pendiente";

  const supabase = await createAdminClient();
  await supabase
    .from("inscripcion")
    .update({
      estado_pago: estadoPago,
      mercadopago_payment_id: paymentId,
    })
    .eq("id", inscripcionId);

  return NextResponse.json({ ok: true });
}
