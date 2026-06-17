import { createHmac } from "crypto";
import { payment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function verifyWebhookSignature(
  request: Request,
  body: { data?: { id?: string } }
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key.trim(), value?.trim() ?? ""];
    })
  );
  const ts = parts["ts"] ?? "";
  const v1 = parts["v1"] ?? "";

  if (!ts || !v1) return false;

  const dataId = String(body.data?.id ?? "");
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === v1;
}

export async function POST(request: Request) {
  const body = await request.json();

  const isDev = process.env.NODE_ENV === "development";
  const hasSecret = !!process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!hasSecret && isDev) {
    console.warn(
      "MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature verification in development"
    );
  } else if (!verifyWebhookSignature(request, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(body.data.id);

  let mpPayment;
  try {
    mpPayment = await payment.get({ id: paymentId });
  } catch (err) {
    console.error("MercadoPago payment fetch error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const inscripcionId = mpPayment.external_reference;
  const status = mpPayment.status;

  if (!inscripcionId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("inscripcion")
    .select("estado_pago")
    .eq("id", inscripcionId)
    .single();

  if (existing?.estado_pago === "pagado" && status !== "approved") {
    return NextResponse.json({ ok: true });
  }

  const estadoPago: "pagado" | "rechazado" | "pendiente" =
    status === "approved"
      ? "pagado"
      : status === "rejected" ||
          status === "cancelled" ||
          status === "refunded" ||
          status === "charged_back"
        ? "rechazado"
        : "pendiente";

  await supabase
    .from("inscripcion")
    .update({
      estado_pago: estadoPago,
      mercadopago_payment_id: paymentId,
    })
    .eq("id", inscripcionId);

  return NextResponse.json({ ok: true });
}
