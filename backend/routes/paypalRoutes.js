const express = require("express");
const { default: axios } = require("axios");
const Producto = require("../models/Producto");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const {
  ProductSelectionError,
  createPaypalProductSelectionService,
} = require("../services/paypalProductSelectionService");
const {
  getPlansWithDetails,
  listAllProducts,
} = require("../services/paypalCatalogService");
const router = express.Router();

const API_PAYPAL = process.env.PAYPAL_API;
const productSelection = createPaypalProductSelectionService();

async function generateAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(`${API_PAYPAL}/v1/oauth2/token`, {
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

function sendSelectionError(error, res) {
  if (error instanceof ProductSelectionError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return null;
}

async function syncPaypalProducts(products) {
  if (products.length === 0) return;

  await Producto.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { paypalProductId: product.id },
        update: {
          $set: {
            name: product.name,
            description: product.description || "",
            create_time: new Date(product.create_time || Date.now()),
          },
          $setOnInsert: {
            paypalProductId: product.id,
            type: product.type || "SERVICE",
            category: product.category || "SOFTWARE",
          },
        },
        upsert: true,
      },
    })),
  );
}

router.post("/crear-producto", authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type = "SERVICE",
      category = "SOFTWARE",
    } = req.body;

    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "Faltan campos obligatorios: name y description" });
    }

    // Captura el estado legado antes de insertar: el producto nuevo nunca se activa solo.
    await productSelection.initializeLegacySelection();
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

    const nuevoProducto = new Producto({
      paypalProductId: productoData.id,
      name,
      description,
      type,
      category,
      create_time: new Date(productoData.create_time || Date.now()),
    });

    await nuevoProducto.save();

    res.status(201).json({
      message: "Producto creado y guardado con éxito",
      producto: nuevoProducto,
    });
  } catch (error) {
    console.error(
      "Error al crear producto:",
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: " producto en PayPal" });
  }
});

router.get("/producto-local", async (req, res) => {
  try {
    const producto = await productSelection.getActiveProduct();
    res.status(200).json(producto ? [producto] : []);
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    res.status(500).json({
      error: "Error al obtener los productos desde la base de datos",
    });
  }
});


router.get("/productos", authenticate, isAdmin, async (req, res) => {
  try {
    // La transición se calcula con los productos que usaba el flujo anterior,
    // antes de sincronizar cualquier producto adicional del catálogo de PayPal.
    await productSelection.initializeLegacySelection();
    const token = await generateAccessToken();
    const paypalProducts = await listAllProducts(API_PAYPAL, token);
    await syncPaypalProducts(paypalProducts);
    const products = await productSelection.listProductsForAdmin();
    res.status(200).json(products);
  } catch (error) {
    console.error(
      "Error al obtener productos de PayPal:",
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: "Error al obtener productos de PayPal" });
  }
});

router.patch(
  "/productos/:productId/seleccionar",
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const config = await productSelection.selectProduct(req.params.productId);
      res.status(200).json({
        message: "Producto seleccionado para American Karaoke",
        activePaypalProductId: config.activePaypalProductId,
      });
    } catch (error) {
      if (sendSelectionError(error, res)) return;
      console.error("Error al seleccionar producto:", error.message);
      res.status(500).json({ error: "No se pudo seleccionar el producto" });
    }
  },
);

router.patch(
  "/productos/:productId/visibilidad",
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      if (typeof req.body.visible !== "boolean") {
        return res.status(400).json({ error: "visible debe ser booleano" });
      }

      await productSelection.setProductVisibility(
        req.params.productId,
        req.body.visible,
      );
      res.status(200).json({
        message: req.body.visible
          ? "Producto visible en American Karaoke"
          : "Producto oculto en American Karaoke",
      });
    } catch (error) {
      if (sendSelectionError(error, res)) return;
      console.error("Error al cambiar visibilidad:", error.message);
      res.status(500).json({ error: "No se pudo cambiar la visibilidad" });
    }
  },
);

router.get("/oferta-activa", async (req, res) => {
  try {
    const product = await productSelection.getActiveProduct();
    if (!product) {
      return res.status(200).json({
        product: null,
        plans: [],
        message: "No hay un producto de suscripción seleccionado.",
      });
    }

    const accessToken = await generateAccessToken();
    const plans = (
      await getPlansWithDetails({
        apiBaseUrl: API_PAYPAL,
        accessToken,
        productId: product.paypalProductId,
        onlyActive: true,
      })
    ).filter((plan) => plan.status === "ACTIVE");

    res.status(200).json({
      product,
      plans,
      message:
        plans.length === 0
          ? "El producto seleccionado no tiene planes activos disponibles."
          : null,
    });
  } catch (error) {
    console.error(
      "Error al obtener la oferta activa:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "No se pudo obtener la oferta activa." });
  }
});

router.post(
  "/producto/:productId/plan",
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { nombre, descripcion, precio, interval_unit, interval_count } =
        req.body;

      if (
        !nombre ||
        !descripcion ||
        !precio ||
        !interval_unit ||
        !interval_count
      ) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }

      const product = await Producto.findOne({
        paypalProductId: productId,
      }).lean();
      if (!product) {
        return res.status(404).json({ error: "Producto no encontrado" });
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
                interval_unit,
                interval_count,
              },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
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
        },
      );

      const planData = planResponse.data;

      res
        .status(201)
        .json({ message: "Plan creado con éxito", plan: planData });
    } catch (error) {
      console.error(
        "Error al crear plan:",
        error?.response?.data || error.message,
      );
      res.status(500).json({ error: "Error al crear el plan" });
    }
  },
);


router.get("/planes/:productId", authenticate, isAdmin, async (req, res) => {
  const { productId } = req.params;

  try {
    const accessToken = await generateAccessToken();

    const planesConDetalle = await getPlansWithDetails({
      apiBaseUrl: API_PAYPAL,
      accessToken,
      productId,
    });

    res.json(planesConDetalle);
  } catch (error) {
    console.error(
      "Error al obtener planes:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "No se pudieron obtener los planes del producto." });
  }
});


module.exports = router;
