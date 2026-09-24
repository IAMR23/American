const Producto = require("../models/Producto");
const PaypalProductConfig = require("../models/PaypalProductConfig");

const CONFIG_ID = "american-karaoke-paypal";

class ProductSelectionError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ProductSelectionError";
    this.statusCode = statusCode;
  }
}

function dateValue(value) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function determineLegacySelection(products) {
  if (products.length === 0) {
    return {
      activePaypalProductId: null,
      transitionStatus: "pending_empty",
    };
  }

  if (products.length === 1) {
    return {
      activePaypalProductId: products[0].paypalProductId,
      transitionStatus: "migrated",
    };
  }

  const firstCreatedAt = dateValue(products[0].create_time);
  const secondCreatedAt = dateValue(products[1].create_time);
  const hasUniqueNewestProduct =
    firstCreatedAt !== null &&
    secondCreatedAt !== null &&
    firstCreatedAt > secondCreatedAt;

  return hasUniqueNewestProduct
    ? {
        activePaypalProductId: products[0].paypalProductId,
        transitionStatus: "migrated",
      }
    : {
        activePaypalProductId: null,
        transitionStatus: "pending_ambiguous",
      };
}

function createPaypalProductSelectionService({
  ProductModel = Producto,
  ConfigModel = PaypalProductConfig,
} = {}) {
  async function initializeLegacySelection() {
    const existingConfig = await ConfigModel.findById(CONFIG_ID).lean();
    if (existingConfig) return existingConfig;

    const products = await ProductModel.find()
      .sort({ create_time: -1 })
      .limit(2)
      .lean();
    const initialSelection = determineLegacySelection(products);

    try {
      return await ConfigModel.findOneAndUpdate(
        { _id: CONFIG_ID },
        {
          $setOnInsert: {
            ...initialSelection,
            hiddenPaypalProductIds: [],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
    } catch (error) {
      // Otra solicitud pudo crear el singleton entre findById y el upsert.
      if (error?.code === 11000) {
        return ConfigModel.findById(CONFIG_ID).lean();
      }
      throw error;
    }
  }

  async function selectProduct(paypalProductId) {
    const product = await ProductModel.findOne({ paypalProductId }).lean();
    if (!product) {
      throw new ProductSelectionError("Producto no encontrado", 404);
    }

    await initializeLegacySelection();

    const config = await ConfigModel.findOneAndUpdate(
      {
        _id: CONFIG_ID,
        hiddenPaypalProductIds: { $ne: paypalProductId },
      },
      {
        $set: {
          activePaypalProductId: paypalProductId,
          transitionStatus: "selected",
        },
      },
      { new: true },
    ).lean();

    if (!config) {
      throw new ProductSelectionError(
        "El producto está oculto. Muéstralo antes de seleccionarlo.",
        409,
      );
    }

    return config;
  }

  async function setProductVisibility(paypalProductId, visible) {
    const product = await ProductModel.findOne({ paypalProductId }).lean();
    if (!product) {
      throw new ProductSelectionError("Producto no encontrado", 404);
    }

    await initializeLegacySelection();

    if (visible) {
      return ConfigModel.findOneAndUpdate(
        { _id: CONFIG_ID },
        { $pull: { hiddenPaypalProductIds: paypalProductId } },
        { new: true },
      ).lean();
    }

    const config = await ConfigModel.findOneAndUpdate(
      {
        _id: CONFIG_ID,
        activePaypalProductId: { $ne: paypalProductId },
      },
      { $addToSet: { hiddenPaypalProductIds: paypalProductId } },
      { new: true },
    ).lean();

    if (!config) {
      throw new ProductSelectionError(
        "No puedes ocultar el producto activo. Selecciona otro primero.",
        409,
      );
    }

    return config;
  }

  async function listProductsForAdmin() {
    const config = await initializeLegacySelection();
    const products = await ProductModel.find().sort({ create_time: -1 }).lean();
    const hiddenIds = new Set(config.hiddenPaypalProductIds || []);

    return products.map((product) => ({
      ...product,
      id: product.paypalProductId,
      isActive: config.activePaypalProductId === product.paypalProductId,
      visibleInKaraoke: !hiddenIds.has(product.paypalProductId),
    }));
  }

  async function getActiveProduct() {
    const config = await initializeLegacySelection();
    const activePaypalProductId = config.activePaypalProductId;

    if (
      !activePaypalProductId ||
      (config.hiddenPaypalProductIds || []).includes(activePaypalProductId)
    ) {
      return null;
    }

    return ProductModel.findOne({
      paypalProductId: activePaypalProductId,
    }).lean();
  }

  return {
    initializeLegacySelection,
    selectProduct,
    setProductVisibility,
    listProductsForAdmin,
    getActiveProduct,
  };
}

module.exports = {
  CONFIG_ID,
  ProductSelectionError,
  determineLegacySelection,
  createPaypalProductSelectionService,
};
