const {
  PAYPAL_PAGE_SIZE,
  getPlansWithDetails,
} = require("../services/paypalCatalogService");

describe("consulta de planes PayPal", () => {
  test("pagina más allá de 20 y publica solamente planes ACTIVE", async () => {
    const firstPage = Array.from({ length: PAYPAL_PAGE_SIZE }, (_, index) => ({
      id: `P-${index + 1}`,
      status: "INACTIVE",
    }));
    const secondPage = [
      { id: "P-21", status: "ACTIVE" },
      { id: "P-22", status: "INACTIVE" },
    ];
    const requestedPages = [];

    const httpClient = {
      get: jest.fn(async (url, options) => {
        if (url.endsWith("/v1/billing/plans")) {
          requestedPages.push(options.params.page);
          return {
            data: {
              plans: options.params.page === 1 ? firstPage : secondPage,
              total_pages: 2,
            },
          };
        }

        const planId = url.split("/").at(-1);
        return {
          data: {
            id: planId,
            status: "ACTIVE",
            billing_cycles: [],
          },
        };
      }),
    };

    const plans = await getPlansWithDetails({
      apiBaseUrl: "https://api-m.sandbox.paypal.com",
      accessToken: "test-token",
      productId: "PROD-A",
      onlyActive: true,
      httpClient,
    });

    expect(requestedPages).toEqual([1, 2]);
    expect(plans).toEqual([
      expect.objectContaining({ id: "P-21", status: "ACTIVE" }),
    ]);
    expect(httpClient.get).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/billing/plans/P-21",
      expect.any(Object),
    );
  });
});
