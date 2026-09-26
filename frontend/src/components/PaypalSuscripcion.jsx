import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";

function Message({ content }) {
  return <p>{content}</p>;
}

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function waitForPaymentConfirmation(token) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await wait(2000);

    try {
      const response = await fetch(`${API_URL}/user/suscripcion`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) return true;
    } catch {
      // El webhook puede tardar; se vuelve a consultar en el siguiente intento.
    }
  }

  return false;
}

function PaypalSuscripcion({ planId }) {
  let userId = null;
  try {
    const token = getToken();
    if (token && typeof token === "string") {
      const decoded = jwtDecode(token);
      userId = decoded.userId;
    }
  } catch {
    console.warn("Usuario no autenticado");
  }
  const initialOptions = {
    "client-id": import.meta.env.VITE_CLIENT_ID,
    vault: true,
    intent: "subscription",
    currency: "USD",
  };

  const [message, setMessage] = useState("");

  return (
    <div className="App">
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          style={{
            shape: "rect",
            layout: "vertical",
            color: "gold",
            label: "subscribe",
          }}
          createSubscription={(data, actions) => {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: userId, // ¡Clave para saber quién paga!
            });
          }}
          // onApprove={(data, actions) => {
          //   setMessage(`Suscripción creada con éxito. ID: ${data.subscriptionID}`);
          //   console.log("Datos de la suscripción:", data);
          //   // Puedes hacer un fetch aquí para notificar a tu backend si deseas
          // }}
          onApprove={async (data) => {
            setMessage(
              `Suscripción creada con éxito. ID: ${data.subscriptionID}`
            );
            console.log("Datos de la suscripción:", data);

            try {
              const token = getToken(); // o como guardes tu JWT

              const res = await fetch(
                `${API_URL}/suscripcion/activar-suscripcion`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    subscriptionID: data.subscriptionID,
                  }),
                }
              );

              const resultado = await res.json();
              console.log("Respuesta del backend:", resultado);

              if (res.ok) {
                setMessage(
                  "✅ Suscripción registrada. Confirmando el pago con PayPal..."
                );

                const paymentConfirmed =
                  await waitForPaymentConfirmation(token);

                if (paymentConfirmed) {
                  setMessage("✅ Pago confirmado. Activando tu cuenta...");
                  window.setTimeout(() => window.location.reload(), 1200);
                } else {
                  setMessage(
                    "La suscripción fue registrada. PayPal aún está procesando la confirmación del pago."
                  );
                }
              } else {
                setMessage(
                  `⚠️ Error al registrar suscripción: ${
                    resultado.message || "Intenta nuevamente"
                  }`
                );
              }
            } catch (err) {
              console.error("❌ Error al contactar backend:", err);
              setMessage("Error al activar suscripción");
            }
          }}
          onError={(err) => {
            setMessage(`Error en la suscripción: ${err.message}`);
            console.error(err);
          }}
        />
      </PayPalScriptProvider>
      <Message content={message} />
    </div>
  );
}

export default PaypalSuscripcion;
