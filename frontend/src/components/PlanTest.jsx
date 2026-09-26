import { useEffect, useState } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PaypalSuscripcion from "./PaypalSuscripcion";
import axios from "axios";
import { API_URL } from "../config";

const PAYPAL_OPTIONS = {
  "client-id": import.meta.env.VITE_CLIENT_ID,
  components: "buttons",
  currency: "USD",
  intent: "subscription",
  vault: true,
};

const PlantTest = () => {
  const [productoActivo, setProductoActivo] = useState(null);
  const [planesActivos, setPlanesActivos] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState(null);
  const [emptyMessage, setEmptyMessage] = useState("");

  useEffect(() => {
    const fetchOfertaActiva = async () => {
      try {
        setLoadingPlanes(true);
        setErrorPlanes(null);
        const response = await axios.get(`${API_URL}/paypal/oferta-activa`);
        setProductoActivo(response.data.product || null);
        setPlanesActivos(response.data.plans || []);
        setEmptyMessage(response.data.message || "");
      } catch (err) {
        setErrorPlanes("No se pudo obtener la oferta de suscripción.");
        setProductoActivo(null);
        setPlanesActivos([]);
        console.error(err);
      } finally {
        setLoadingPlanes(false);
      }
    };

    fetchOfertaActiva();
  }, []);

  const mapIntervalUnit = (unit) => {
    switch (unit) {
      case "DAY":
        return "Día";
      case "WEEK":
        return "Semana";
      case "MONTH":
        return "Mes";
      case "YEAR":
        return "Año";
      default:
        return unit.toLowerCase();
    }
  };

  return (
    <PayPalScriptProvider options={PAYPAL_OPTIONS}>
      <div className="p-2 min-vh-100 d-flex align-items-center justify-content-center">
  {errorPlanes && <div className="alert alert-danger">{errorPlanes}</div>}

  {loadingPlanes ? (
    <div className="text-center text-light my-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">Cargando planes...</p>
    </div>
  ) : errorPlanes ? null : planesActivos.length === 0 ? (
    <div className="alert alert-info text-center" role="status">
      {emptyMessage ||
        (productoActivo
          ? "El producto seleccionado no tiene planes activos disponibles."
          : "No hay un producto de suscripción seleccionado.")}
    </div>
  ) : (
    <div className="container-fluid px-0">
      <div className="row g-4 justify-content-center align-items-stretch">
        {planesActivos.map((plan, index) => {
          const ciclo = plan.billing_cycles?.[0];

          const frecuencia = ciclo?.frequency
            ? `x${ciclo.frequency.interval_count} ${mapIntervalUnit(
                ciclo.frequency.interval_unit
              )}`
            : "—";

          const precioValor =
            ciclo?.pricing_scheme?.fixed_price?.value || "—";
          const precioMoneda =
            ciclo?.pricing_scheme?.fixed_price?.currency_code || "";

          const borderColor = index % 2 === 0 ? "primary" : "danger";

          return (
            <div className="col-12 col-md-6 d-flex" key={plan.id}>
              <div className={`card border-${borderColor} bg-dark h-100 w-100`}>
                <div className="card-body d-flex flex-column">
                  <div className="text-light">
                    <h3>{plan.name}</h3>
                    <p>{plan.description || "Sin descripción disponible."}</p>
                  </div>

                  <div className="mt-auto text-light">
                    <div className="d-flex align-items-center mb-2">
                      <span className="fs-3">{precioMoneda}</span>
                      <span className="display-1 fw-semibold">
                        {precioValor}
                      </span>
                    </div>

                    <ul className="list-unstyled text-light">
                      <li className="d-flex align-items-center mb-2">
                        <svg
                          className="me-2"
                          width="20"
                          height="20"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        Ciclo de facturación: {frecuencia}
                      </li>

                      <li className="d-flex align-items-center">
                        <svg
                          className="me-2"
                          width="20"
                          height="20"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        Precio: {precioValor} {precioMoneda}
                        <span className="badge bg-primary ms-2">New!</span>
                      </li>
                    </ul>

                    <div className="w-100 mt-3">
                      <PaypalSuscripcion planId={plan.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="col-12 d-flex justify-content-center">
          <div className="bg-secondary rounded-4 p-3 d-flex justify-content-center align-items-center">
            <img
              src="./transferencia.png"
              alt="Transferencia"
              className="img-fluid rounded-4"
            
            />
          </div>
        </div>
      </div>
    </div>
  )}
      </div>
    </PayPalScriptProvider>
  );
};

export default PlantTest;
