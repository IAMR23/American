import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "./auth";
import {
  SUBSCRIPTION_INACTIVE_EVENT,
  SUBSCRIPTION_UPDATED_EVENT,
  getSubscriptionEndDate,
  suscripcionEstaVigente,
  tieneAccesoKaraoke,
} from "./subscription";

const SubscriptionContext = createContext(null);

const estadoInicial = {
  loading: false,
  suscripcionVigente: false,
  tieneAccesoKaraoke: false,
  subscriptionEnd: null,
  error: null,
};

export function SubscriptionProvider({ auth, token, children }) {
  const [state, setState] = useState({
    ...estadoInicial,
    loading: Boolean(token),
  });
  const requestIdRef = useRef(0);

  const marcarSuscripcionInactiva = useCallback(
    (error = null) => {
      if (auth?.rol === "admin") {
        setState({
          loading: false,
          suscripcionVigente: false,
          tieneAccesoKaraoke: true,
          subscriptionEnd: null,
          error: null,
        });
        return;
      }

      setState({
        loading: false,
        suscripcionVigente: false,
        tieneAccesoKaraoke: false,
        subscriptionEnd: null,
        error,
      });
    },
    [auth?.rol],
  );

  const verificarSuscripcion = useCallback(async () => {
    const currentToken = token || getToken();

    if (!currentToken || !auth?.isAuthenticated) {
      marcarSuscripcionInactiva(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await axios.get(`${API_URL}/user/suscripcion`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (requestId !== requestIdRef.current) return;

      const subscription = {
        ...res.data,
        rol: res.data?.rol || auth.rol,
      };
      const vigente = suscripcionEstaVigente(subscription);
      const acceso = tieneAccesoKaraoke(subscription);

      setState({
        loading: false,
        suscripcionVigente: vigente,
        tieneAccesoKaraoke: acceso,
        subscriptionEnd: subscription.subscriptionEnd || null,
        error: null,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error al verificar suscripcion:", error);
      marcarSuscripcionInactiva(error);
    }
  }, [
    auth?.isAuthenticated,
    auth?.rol,
    marcarSuscripcionInactiva,
    token,
  ]);

  useEffect(() => {
    verificarSuscripcion();
  }, [verificarSuscripcion]);

  useEffect(() => {
    const handleInactive = (event) => {
      marcarSuscripcionInactiva(event.detail || null);
    };
    const handleUpdated = () => {
      verificarSuscripcion();
    };

    window.addEventListener(SUBSCRIPTION_INACTIVE_EVENT, handleInactive);
    window.addEventListener(SUBSCRIPTION_UPDATED_EVENT, handleUpdated);

    return () => {
      window.removeEventListener(SUBSCRIPTION_INACTIVE_EVENT, handleInactive);
      window.removeEventListener(SUBSCRIPTION_UPDATED_EVENT, handleUpdated);
    };
  }, [marcarSuscripcionInactiva, verificarSuscripcion]);

  useEffect(() => {
    if (!state.tieneAccesoKaraoke || auth?.rol === "admin") return undefined;

    const fin = getSubscriptionEndDate(state.subscriptionEnd);
    if (!fin) {
      marcarSuscripcionInactiva();
      return undefined;
    }

    const msHastaVencimiento = fin.getTime() - Date.now();
    if (msHastaVencimiento <= 0) {
      marcarSuscripcionInactiva();
      return undefined;
    }

    const timeout = window.setTimeout(
      () => marcarSuscripcionInactiva(),
      Math.min(msHastaVencimiento + 1000, 2147483647),
    );

    return () => window.clearTimeout(timeout);
  }, [
    auth?.rol,
    marcarSuscripcionInactiva,
    state.subscriptionEnd,
    state.tieneAccesoKaraoke,
  ]);

  const value = useMemo(
    () => ({
      ...state,
      verificarSuscripcion,
      marcarSuscripcionInactiva,
    }),
    [marcarSuscripcionInactiva, state, verificarSuscripcion],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription debe usarse dentro de SubscriptionProvider");
  }

  return context;
}
