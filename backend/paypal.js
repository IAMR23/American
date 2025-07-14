// server/paypal.js
const fetch = require("node-fetch");
require("dotenv").config();

async function generateAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${process.env.PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

async function createOrder() {
  const accessToken = await generateAccessToken();

  const res = await fetch(`${process.env.PAYPAL_API}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: "5.00", // Ajusta este valor según el plan
        },
      }],
    }),
  });

  return res.json();
}

async function captureOrder(orderId) {
  const accessToken = await generateAccessToken();

  const res = await fetch(`${process.env.PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

module.exports = { createOrder, captureOrder , generateAccessToken };
