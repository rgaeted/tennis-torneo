import MercadoPagoConfig, { Preference, Payment } from "mercadopago";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const preference = new Preference(mp);
export const payment = new Payment(mp);

export interface CreatePreferenceInput {
  titulo: string;
  monto: number;
  inscripcionId: string;
  jugadorEmail: string;
  appUrl: string;
}

export async function crearPreferencia(input: CreatePreferenceInput) {
  const result = await preference.create({
    body: {
      items: [
        {
          id: input.inscripcionId,
          title: input.titulo,
          quantity: 1,
          unit_price: input.monto,
          currency_id: "ARS",
        },
      ],
      payer: { email: input.jugadorEmail },
      back_urls: {
        success: `${input.appUrl}/mi-perfil?pago=ok`,
        failure: `${input.appUrl}/mi-perfil?pago=error`,
        pending: `${input.appUrl}/mi-perfil?pago=pendiente`,
      },
      auto_return: "approved",
      external_reference: input.inscripcionId,
      notification_url: `${input.appUrl}/api/pagos/webhook`,
    },
  });
  return result;
}
