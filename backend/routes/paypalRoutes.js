const express = require("express");
const { createOrder, captureOrder } = require("../paypal");
const { default: axios } = require("axios");
const Producto = require("../models/Producto");
const Plan = require("../models/Plan");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const {
  getActivePlansForProduct,
  getPublicProductsWithActivePlans,
  serializePlan,
} = require("../services/paypalSubscriptionService");
const { generateAccessToken } = require("../paypal");
const router = express.Router();

const API_PAYPAL = process.env.PAYPAL_API

const INTERVAL_DAYS = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

router.post("/crear-producto", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, type = "SERVICE", category = "SOFTWARE" } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: "Faltan campos obligatorios: name y description" });
    }

    const accessToken = await generateAccessToken();

    const response = await axios.post(
      `${API_PAYPAL}/v1/catalogs/products`,
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

    res.status(201).json({
      message: "Producto creado y guardado con exito",
      producto: {
        paypalProductId: nuevoProducto.paypalProductId,
        name: nuevoProducto.name,
        description: nuevoProducto.description,
        type: nuevoProducto.type,
        category: nuevoProducto.category,
        create_time: nuevoProducto.create_time,
      },
    });
  } catch (error) {
    console.error("Error al crear producto:", error?.response?.data || error.message);
    res.status(500).json({ error: " producto en PayPal" });
  }
});

router.get("/producto-local", async (req, res) => {
  try {
    const productos = await getPublicProductsWithActivePlans();
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    res.status(500).json({ error: "Error al obtener los productos desde la base de datos" });
  }
});


router.get("/productos", authenticate, isAdmin, async (req, res) => {
  try {
    const token = await generateAccessToken(); // Tu función para obtener el access_token

    const response = await axios.get(
      `${API_PAYPAL}/v1/catalogs/products`,
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

router.post("/producto/:productId/plan", authenticate, isAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { nombre, descripcion, precio, interval_unit, interval_count } = req.body;

    const parsedPrice = Number(precio);
    const parsedIntervalCount = Number(interval_count);

    if (!nombre || !descripcion || !parsedPrice || !interval_unit || !parsedIntervalCount) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (!INTERVAL_DAYS[interval_unit]) {
      return res.status(400).json({ error: "Unidad de intervalo invalida" });
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "Precio invalido" });
    }

    if (!Number.isInteger(parsedIntervalCount) || parsedIntervalCount < 1) {
      return res.status(400).json({ error: "Intervalo invalido" });
    }

    const accessToken = await generateAccessToken();

    const planResponse = await axios.post(
      `${API_PAYPAL}/v1/billing/plans`,
      {
        product_id: productId,
        name: nombre,
        description: descripcion,

        billing_cycles: [
          {
            frequency: {
              interval_unit,       // <-- AHORA VIENE DEL FRONT
              interval_count: parsedIntervalCount,
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,       // 0 = renovación infinita
            pricing_scheme: {
              fixed_price: {
                value: parsedPrice.toFixed(2),
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
    const planLocal = await Plan.findOneAndUpdate(
      { paypalPlanId: planData.id },
      {
        $set: {
          paypalPlanId: planData.id,
          productId,
          nombre,
          descripcion,
          precio: parsedPrice,
          duracionDias: INTERVAL_DAYS[interval_unit] * parsedIntervalCount,
          intervalUnit: interval_unit,
          intervalCount: parsedIntervalCount,
          currency: "USD",
          estado: planData.status || "CREATED",
          create_time: planData.create_time
            ? new Date(planData.create_time)
            : new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({
      message: "Plan creado con exito",
      plan: serializePlan(planLocal),
      paypalStatus: planData.status,
    });

  } catch (error) {
    console.error("Error al crear plan:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error al crear el plan" });
  }
});

async function getPlanDetalle(planId, accessToken) {
  try {
    const response = await axios.get(
      `${API_PAYPAL}/v1/billing/plans/${planId}`,
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
    const planesActivos = await getActivePlansForProduct(productId);
    res.json(planesActivos);
  } catch (error) {
    console.error("Error al obtener planes:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudieron obtener los planes del producto." });
  }
});

router.get("/admin/planes/:productId", authenticate, isAdmin, async (req, res) => {
  try {
    const planes = await Plan.find({ productId: req.params.productId })
      .sort({ create_time: -1 })
      .lean();
    res.json(planes.map(serializePlan));
  } catch (error) {
    console.error("Error al obtener planes admin:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudieron obtener los planes." });
  }
});


module.exports = router
