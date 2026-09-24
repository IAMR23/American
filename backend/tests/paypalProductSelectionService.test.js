const {
  createPaypalProductSelectionService,
  determineLegacySelection,
} = require("../services/paypalProductSelectionService");

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createQuery(getValue) {
  return {
    lean: async () => clone(getValue()),
  };
}

function createInMemoryModels(products) {
  let config = null;

  const ProductModel = {
    findOne(filter) {
      return createQuery(() =>
        products.find(
          (product) => product.paypalProductId === filter.paypalProductId,
        ),
      );
    },
    find() {
      let limit = products.length;
      return {
        sort() {
          return this;
        },
        limit(value) {
          limit = value;
          return this;
        },
        lean: async () =>
          clone(
            [...products]
              .sort(
                (left, right) =>
                  new Date(right.create_time) - new Date(left.create_time),
              )
              .slice(0, limit),
          ),
      };
    },
  };

  const ConfigModel = {
    findById() {
      return createQuery(() => config);
    },
    findOneAndUpdate(filter, update, options = {}) {
      return createQuery(() => {
        const inserting = config === null;
        if (inserting) {
          if (!options.upsert) return null;
          config = {
            _id: filter._id,
            activePaypalProductId: null,
            hiddenPaypalProductIds: [],
          };
        }

        if (
          filter.hiddenPaypalProductIds?.$ne &&
          config.hiddenPaypalProductIds.includes(
            filter.hiddenPaypalProductIds.$ne,
          )
        ) {
          return null;
        }

        if (
          filter.activePaypalProductId?.$ne &&
          config.activePaypalProductId === filter.activePaypalProductId.$ne
        ) {
          return null;
        }

        if (inserting && update.$setOnInsert) {
          Object.assign(config, clone(update.$setOnInsert));
        }
        if (update.$set) Object.assign(config, clone(update.$set));

        if (update.$addToSet?.hiddenPaypalProductIds) {
          const id = update.$addToSet.hiddenPaypalProductIds;
          if (!config.hiddenPaypalProductIds.includes(id)) {
            config.hiddenPaypalProductIds.push(id);
          }
        }

        if (update.$pull?.hiddenPaypalProductIds) {
          const id = update.$pull.hiddenPaypalProductIds;
          config.hiddenPaypalProductIds =
            config.hiddenPaypalProductIds.filter((hiddenId) => hiddenId !== id);
        }

        return config;
      });
    },
  };

  return {
    ProductModel,
    ConfigModel,
    getConfig: () => clone(config),
  };
}

const products = [
  {
    paypalProductId: "PROD-A",
    name: "Producto A",
    create_time: "2025-01-01T00:00:00.000Z",
  },
  {
    paypalProductId: "PROD-B",
    name: "Producto B",
    create_time: "2025-02-01T00:00:00.000Z",
  },
];

describe("selección del producto PayPal", () => {
  test("migra el producto legado solo cuando el más reciente es inequívoco", () => {
    expect(determineLegacySelection([products[1], products[0]])).toEqual({
      activePaypalProductId: "PROD-B",
      transitionStatus: "migrated",
    });

    expect(
      determineLegacySelection([
        { ...products[0], create_time: "2025-03-01T00:00:00.000Z" },
        { ...products[1], create_time: "2025-03-01T00:00:00.000Z" },
      ]),
    ).toEqual({
      activePaypalProductId: null,
      transitionStatus: "pending_ambiguous",
    });
  });

  test("mantiene como máximo un producto activo ante selecciones simultáneas", async () => {
    const models = createInMemoryModels(products);
    const service = createPaypalProductSelectionService(models);

    await Promise.all([
      service.selectProduct("PROD-A"),
      service.selectProduct("PROD-B"),
    ]);

    const listedProducts = await service.listProductsForAdmin();
    expect(listedProducts.filter((product) => product.isActive)).toHaveLength(1);
    expect(["PROD-A", "PROD-B"]).toContain(
      models.getConfig().activePaypalProductId,
    );
  });

  test("un producto creado después de la transición no se activa solo", async () => {
    const mutableProducts = [];
    const models = createInMemoryModels(mutableProducts);
    const service = createPaypalProductSelectionService(models);

    await service.initializeLegacySelection();
    mutableProducts.push(products[0]);

    await expect(service.getActiveProduct()).resolves.toBeNull();
    expect(models.getConfig().activePaypalProductId).toBeNull();
  });

  test("cambia la oferta sin alterar los productos existentes", async () => {
    const models = createInMemoryModels(products);
    const service = createPaypalProductSelectionService(models);

    await service.selectProduct("PROD-A");
    await service.selectProduct("PROD-B");

    const listedProducts = await service.listProductsForAdmin();
    expect(listedProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "PROD-A", isActive: false }),
        expect.objectContaining({ id: "PROD-B", isActive: true }),
      ]),
    );
  });

  test("impide ocultar el activo y permite ocultar otro producto", async () => {
    const models = createInMemoryModels(products);
    const service = createPaypalProductSelectionService(models);

    await service.selectProduct("PROD-B");
    await expect(
      service.setProductVisibility("PROD-B", false),
    ).rejects.toMatchObject({ statusCode: 409 });

    await service.setProductVisibility("PROD-A", false);
    const listedProducts = await service.listProductsForAdmin();
    expect(listedProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "PROD-A",
          isActive: false,
          visibleInKaraoke: false,
        }),
        expect.objectContaining({
          id: "PROD-B",
          isActive: true,
          visibleInKaraoke: true,
        }),
      ]),
    );
  });
});
