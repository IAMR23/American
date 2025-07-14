import React, { useEffect, useState } from "react";
import PaypalSuscripcion from "./PaypalSuscripcion";
import axios from "axios";
import { API_URL } from "../config"

const PlantTest = () => {

  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(null);

  const [paypalProductId, setPaypalProductId] = useState(null);

  const [planesActivos, setPlanesActivos] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [errorPlanes, setErrorPlanes] = useState(null);

  // Fetch productos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        setErrorProductos(null);

        const res = await axios.get(`${API_URL}/paypal/producto-local`);
        setProductos(res.data);

        if (res.data.length > 0) {
          setPaypalProductId(res.data[0].paypalProductId);
        }
      } catch (err) {
        setErrorProductos("Error al cargar productos");
        console.error(err);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, []);

  // Fetch planes activos cuando paypalProductId cambia
  useEffect(() => {
    if (!paypalProductId) return;

    const fetchPlanesActivos = async (id) => {
      try {
        setLoadingPlanes(true);
        setErrorPlanes(null);

        const response = await axios.get(
          `${API_URL}/paypal/planes/${id}`
        );
        const todosLosPlanes = response.data || [];

        const activos = todosLosPlanes.filter(
          (plan) => plan.status === "ACTIVE"
        );
        setPlanesActivos(activos);
      } catch (err) {
        setErrorPlanes("No se pudieron obtener los planes activos.");
        setPlanesActivos([]);
        console.error("Error al obtener planes activos:", err);
      } finally {
        setLoadingPlanes(false);
      }
    };

    fetchPlanesActivos(paypalProductId);
  }, [paypalProductId]);

  // Render

  if (loadingProductos)
    return <p className="text-light">Cargando productos...</p>;
  if (errorProductos) return <p className="text-danger">{errorProductos}</p>;

  return (
    <div className="p-2">
      {errorPlanes && <div className="alert alert-danger">{errorPlanes}</div>}

      {loadingPlanes ? (
        <div className="text-center text-light my-4">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Cargando planes...</p>
        </div>
      ) : planesActivos.length === 0 ? (
        <div className="text-light">
          No hay planes
        </div>
      ) : (
        <div className="container">
          <div className="row g-4 justify-content-center">
            {planesActivos.map((plan, index) => {
              const ciclo = plan.billing_cycles?.[0];
              const frecuencia = ciclo?.frequency
                ? `${ciclo.frequency.interval_unit} x${ciclo.frequency.interval_count}`
                : "—";

              const precioValor =
                ciclo?.pricing_scheme?.fixed_price?.value || "—";
              const precioMoneda =
                ciclo?.pricing_scheme?.fixed_price?.currency_code || "";

              const borderColor = index % 2 === 0 ? "primary" : "danger";

              return (
                <div className="col-12 col-lg-6" key={plan.id}>
                  <div className={`card border-${borderColor} bg-dark h-100`}>
                    <div className="card-body d-flex flex-column">
                      <div className="text-light">
                        <h3 className="fw-bold">{plan.name}</h3>
                        <p>
                          {plan.description || "Sin descripción disponible."}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <div className="d-flex align-items-center mb-2">
                          <span className="fs-3">{precioMoneda}</span>
                          <span className="display-1 fw-semibold">
                            {precioValor}
                          </span>
                          <span className="fs-2">/ {frecuencia}</span>
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

                        <button className="btn btn-primary w-100 mt-3">
                          <PaypalSuscripcion planId={plan.id} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantTest;
