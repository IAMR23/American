const axios = require("axios");

const PAYPAL_PAGE_SIZE = 20;

async function listAllPages({
  url,
  accessToken,
  collectionKey,
  params = {},
  httpClient = axios,
}) {
  const items = [];
  let page = 1;
  let totalPages = null;

  do {
    const response = await httpClient.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params: {
        ...params,
        page,
        page_size: PAYPAL_PAGE_SIZE,
        total_required: true,
      },
    });

    const pageItems = response.data?.[collectionKey] || [];
    items.push(...pageItems);
    totalPages = Number(response.data?.total_pages) || null;

    if (
      (totalPages !== null && page >= totalPages) ||
      (totalPages === null && pageItems.length < PAYPAL_PAGE_SIZE)
    ) {
      break;
    }

    page += 1;
  } while (true);

  return items;
}

function listAllProducts(apiBaseUrl, accessToken, httpClient = axios) {
  return listAllPages({
    url: `${apiBaseUrl}/v1/catalogs/products`,
    accessToken,
    collectionKey: "products",
    httpClient,
  });
}

function listAllPlans(
  apiBaseUrl,
  accessToken,
  productId,
  httpClient = axios,
) {
  return listAllPages({
    url: `${apiBaseUrl}/v1/billing/plans`,
    accessToken,
    collectionKey: "plans",
    params: { product_id: productId },
    httpClient,
  });
}

async function getPlanDetail(
  apiBaseUrl,
  accessToken,
  planId,
  httpClient = axios,
) {
  try {
    const response = await httpClient.get(
      `${apiBaseUrl}/v1/billing/plans/${planId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error obteniendo detalle plan ${planId}:`,
      error.response?.data || error.message,
    );
    return null;
  }
}

async function getPlansWithDetails({
  apiBaseUrl,
  accessToken,
  productId,
  onlyActive = false,
  httpClient = axios,
}) {
  const plans = await listAllPlans(
    apiBaseUrl,
    accessToken,
    productId,
    httpClient,
  );
  const visiblePlans = onlyActive
    ? plans.filter((plan) => plan.status === "ACTIVE")
    : plans;

  return Promise.all(
    visiblePlans.map(async (plan) => {
      const detail = await getPlanDetail(
        apiBaseUrl,
        accessToken,
        plan.id,
        httpClient,
      );
      return detail || plan;
    }),
  );
}

module.exports = {
  PAYPAL_PAGE_SIZE,
  listAllPages,
  listAllProducts,
  listAllPlans,
  getPlanDetail,
  getPlansWithDetails,
};
