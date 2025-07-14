const express = require("express");
const { createOrder, captureOrder } = require("../paypal");
const { default: axios } = require("axios");
const Producto = require("../models/Producto");
const Plan = require("../models/Plan");
const router = express.Router();

async function generateAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

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

router.post("/crear-producto", async (req, res) => {
  try {
    const { name, description, type = "SERVICE", category = "SOFTWARE" } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: "Faltan campos obligatorios: name y description" });
    }

    const accessToken = await generateAccessToken();

    const response = await axios.post(
      "https://api-m.sandbox.paypal.com/v1/catalogs/products",
      {
        name,
        description,
        type,
        category,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const productoData = response.data;

    // Guardar en la base de datos (opcional)
    const nuevoProducto = new Producto({
      paypalProductId: productoData.id,
      name,
      description,
      type,
      category,
      create_time: new Date(productoData.create_time || Date.now())
    });

    await nuevoProducto.save();

    res.status(201).json({ message: "Producto creado y guardado con éxito", producto: nuevoProducto });
  } catch (error) {
    console.error("Error al crear producto:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error al crear el producto en PayPal" });
  }
});

router.get("/producto-local", async (req, res) => {
  try {
    const productos = await Producto.find().sort({ create_time: -1 }); // ordena por los más recientes
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    res.status(500).json({ error: "Error al obtener los productos desde la base de datos" });
  }
});


router.get("/productos", async (req, res) => {
  try {
    const token = await generateAccessToken(); // Tu función para obtener el access_token

    const response = await axios.get(
      "https://api-m.sandbox.paypal.com/v1/catalogs/products",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Productos:", response.data.products);
    res.status(200).json(response.data.products); // Retorna los productos al frontend
  } catch (error) {
    console.error("Error al obtener productos de PayPal:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error al obtener productos de PayPal" });
  }
});

//crear un plan para un producto 

router.post("/producto/:productId/plan", async (req, res) => {
  try {
    const { productId } = req.params;
    const { nombre, descripcion, precio, duracionDias } = req.body;

    if (!nombre || !descripcion || !precio || !duracionDias) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const accessToken = await generateAccessToken();

    const planResponse = await axios.post(
      "https://api-m.sandbox.paypal.com/v1/billing/plans",
      {
        product_id: productId,
        name: nombre,
        description: descripcion,
        billing_cycles: [
          {
            frequency: {
              interval_unit: "DAY",
              interval_count: duracionDias,
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 1,
            pricing_scheme: {
              fixed_price: {
                value: precio.toFixed(2),
                currency_code: "USD",
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const planData = planResponse.data;

    const nuevoPlan = new Plan({
      paypalPlanId: planData.id,
      productId,
      nombre,
      descripcion,
      precio,
      duracionDias,
      currency: planData.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.currency_code || "USD",
      estado: planData.status || "INACTIVE",
      create_time: new Date(planData.create_time || Date.now())
    });

    await nuevoPlan.save();

    res.status(201).json({ message: "Plan creado y guardado con éxito", plan: nuevoPlan });
  } catch (error) {
    console.error("Error al crear plan:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error al crear y guardar el plan" });
  }
});

//obtner los planes de un producto 
// router.get("/planes/:productId", async (req, res) => {
//   const { productId } = req.params;

//   try {
//     const accessToken = await generateAccessToken();

//     const response = await axios.get("https://api-m.sandbox.paypal.com/v1/billing/plans", {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json"
//       },
//       params: {
//         product_id: productId,
//         page_size: 20
//       }
//     });

//     res.json(response.data.plans || []);
//   } catch (error) {
//     console.error("Error al obtener planes:", error.response?.data || error.message);
//     res.status(500).json({ error: "No se pudieron obtener los planes del producto." });
//   }
// });


async function getPlanDetalle(planId, accessToken) {
  try {
    const response = await axios.get(
      `https://api-m.sandbox.paypal.com/v1/billing/plans/${planId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo detalle plan ${planId}:`, error.response?.data || error.message);
    return null;
  }
}

router.get("/planes/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const accessToken = await generateAccessToken();

    // Obtener lista básica de planes para el producto
    const response = await axios.get("https://api-m.sandbox.paypal.com/v1/billing/plans", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      params: {
        product_id: productId,
        page_size: 20
      }
    });

    const planesBasicos = response.data.plans || [];

    // Obtener detalles completos de cada plan en paralelo
    const planesConDetalle = await Promise.all(
      planesBasicos.map(async (plan) => {
        const detalle = await getPlanDetalle(plan.id, accessToken);
        return detalle || plan; // Si falla, devuelve plan básico
      })
    );

    res.json(planesConDetalle);
  } catch (error) {
    console.error("Error al obtener planes:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudieron obtener los planes del producto." });
  }
});


module.exports = router