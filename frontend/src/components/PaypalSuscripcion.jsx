import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config"
import { getToken } from "../utils/auth";

function Message({ content }) {
  return <p>{content}</p>;
}

function PaypalSuscripcion({ planId }) {

  let userId = null;
  let isAuthenticated = false;
  try {
    const token = getToken();
    if (token && typeof token === "string") {
      const decoded = jwtDecode(token);
      userId = decoded.userId;
      isAuthenticated = true;
    }
  } catch (error) {
    console.warn("Usuario no autenticado");
  }
  const initialOptions = {
    "client-id":
      "AX-QrOl40YLb-vOl8j3wdMGcTsgAGTjxiSrTaSLiiMeqIpOQTRGpcXm8djIVNv6zgbOj-SN9x3ALlaxO",
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
          onApprove={async (data, actions) => {
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
                    userId: userId,
                  }),
                }
              );

              const resultado = await res.json();
              console.log("Respuesta del backend:", resultado);

              if (res.ok) {
                setMessage("✅ Suscripción activada en tu cuenta.");
                // Opcional: recargar la página para ver funciones premium
                // window.location.reload();
              } else {
                setMessage(
                  `⚠️ Error al activar suscripción: ${resultado.mensaje}`
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
