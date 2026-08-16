export const SUBSCRIPTION_INACTIVE_EVENT =
  "american-karaoke:subscription-inactive";
export const SUBSCRIPTION_UPDATED_EVENT =
  "american-karaoke:subscription-updated";
export const SUBSCRIPTION_INACTIVE_CODE = "SUBSCRIPTION_INACTIVE";

export function getSubscriptionEndDate(subscriptionEnd) {
  if (!subscriptionEnd) return null;

  const date = new Date(subscriptionEnd);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function suscripcionEstaVigente(subscription = {}) {
  const fin = getSubscriptionEndDate(subscription.subscriptionEnd);

  return (
    subscription.suscrito === true &&
    Boolean(fin) &&
    Date.now() < fin.getTime()
  );
}

export function tieneAccesoKaraoke(subscription = {}) {
  const role = subscription.rol || subscription.userRole;
  return role === "admin" || suscripcionEstaVigente(subscription);
}

export function esErrorSuscripcionInactiva(error) {
  if (error?.response?.status !== 403) return false;

  const data = error.response?.data || {};
  const text = [
    data.code,
    data.message,
    data.mensaje,
    data.error,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("subscription") || text.includes("suscrip");
}

export function notificarSuscripcionInactiva(detail = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT, { detail }),
  );
}

export function notificarSuscripcionActualizada(detail = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTION_UPDATED_EVENT, { detail }),
  );
}
