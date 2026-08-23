import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiRefreshCw,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { API_URL } from "../config";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatBytes = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  const value = size / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (value) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function SubirPDFPremium() {
  const fileInputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [currentPdf, setCurrentPdf] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mensaje, setMensaje] = useState(null);

  const currentPdfUrl = currentPdf?.url ? `${API_URL}${currentPdf.url}` : "";
  const selectedFileValid =
    archivo && archivo.type === "application/pdf" && archivo.size <= MAX_FILE_SIZE;

  const selectedFileStatus = useMemo(() => {
    if (!archivo) return "Selecciona un PDF para reemplazar el documento actual.";
    if (archivo.type !== "application/pdf") return "El archivo debe ser PDF.";
    if (archivo.size > MAX_FILE_SIZE) return "El archivo supera el limite de 50 MB.";
    return "Listo para publicar.";
  }, [archivo]);

  const cargarUltimoPdf = async () => {
    try {
      setLoadingPdf(true);
      const res = await axios.get(`${API_URL}/pdf/ultimo-pdf`);
      setCurrentPdf(res.data?.file ? res.data : null);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error al obtener PDF:", error.response?.data || error);
      }
      setCurrentPdf(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  useEffect(() => {
    cargarUltimoPdf();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setArchivo(file);
    setMensaje(null);
    setUploadProgress(0);
  };

  const limpiarSeleccion = () => {
    setArchivo(null);
    setUploadProgress(0);
    setMensaje(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!archivo) {
      setMensaje({ tipo: "warning", texto: "Selecciona un archivo PDF." });
      return;
    }

    if (!selectedFileValid) {
      setMensaje({ tipo: "danger", texto: selectedFileStatus });
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      setUploading(true);
      setMensaje(null);
      setUploadProgress(0);

      const res = await axios.post(`${API_URL}/pdf/upload-pdf`, formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(
            Math.round((progressEvent.loaded * 100) / progressEvent.total),
          );
        },
      });

      setCurrentPdf(res.data);
      setMensaje({
        tipo: "success",
        texto: "Documento publicado correctamente.",
      });
      limpiarSeleccion();
    } catch (error) {
      console.error("Error al subir PDF:", error.response?.data || error);
      setMensaje({
        tipo: "danger",
        texto: error.response?.data?.message || "Error al subir el documento.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="container-fluid py-4 px-3 px-lg-4">
      <div className="mx-auto" style={{ maxWidth: "1180px" }}>
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
          <div>
            <p className="text-uppercase text-muted fw-semibold small mb-1">
              Gestion de documento
            </p>
            <h1 className="h3 fw-bold mb-1">Manual del sistema</h1>
            <p className="text-muted mb-0">
              Publica el PDF que veran los usuarios en la seccion de ayuda.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={cargarUltimoPdf}
            disabled={loadingPdf}
          >
            <FiRefreshCw />
            Actualizar estado
          </button>
        </div>

        <div className="row g-4 align-items-stretch">
          <section className="col-12 col-lg-7">
            <div className="bg-white border rounded-3 shadow-sm h-100 overflow-hidden">
              <div className="d-flex align-items-center justify-content-between gap-3 border-bottom px-4 py-3">
                <div>
                  <h2 className="h5 fw-bold mb-1">Documento publicado</h2>
                  <p className="text-muted small mb-0">
                    Vista previa del PDF actualmente activo.
                  </p>
                </div>

                <span
                  className={`badge rounded-pill ${
                    currentPdf ? "text-bg-success" : "text-bg-secondary"
                  }`}
                >
                  {currentPdf ? "Activo" : "Sin PDF"}
                </span>
              </div>

              <div className="p-4">
                {loadingPdf && (
                  <div className="d-flex align-items-center justify-content-center text-muted border rounded-3 bg-light" style={{ minHeight: "420px" }}>
                    Cargando documento...
                  </div>
                )}

                {!loadingPdf && currentPdf && (
                  <>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                      <div className="d-flex align-items-center gap-3 min-w-0">
                        <div className="d-flex align-items-center justify-content-center rounded-3 bg-danger-subtle text-danger" style={{ width: 48, height: 48 }}>
                          <FiFileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="fw-semibold text-truncate">
                            {currentPdf.originalName || currentPdf.file}
                          </div>
                          <div className="text-muted small">
                            {formatBytes(currentPdf.size)} · {formatDate(currentPdf.uploadedAt)}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <a
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                          href={currentPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FiExternalLink />
                          Abrir
                        </a>
                        <a
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                          href={currentPdfUrl}
                          download
                        >
                          <FiDownload />
                          Descargar
                        </a>
                      </div>
                    </div>

                    <div className="border rounded-3 overflow-hidden bg-light">
                      <iframe
                        src={currentPdfUrl}
                        title="PDF publicado"
                        width="100%"
                        height="520"
                        style={{ border: 0 }}
                      />
                    </div>
                  </>
                )}

                {!loadingPdf && !currentPdf && (
                  <div className="d-flex flex-column align-items-center justify-content-center text-center border rounded-3 bg-light px-4 py-5" style={{ minHeight: "420px" }}>
                    <FiFileText size={42} className="text-muted mb-3" />
                    <h3 className="h5 fw-bold">Todavia no hay un PDF publicado</h3>
                    <p className="text-muted mb-0">
                      Sube el primer documento para que aparezca en ayuda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="col-12 col-lg-5">
            <div className="bg-white border rounded-3 shadow-sm h-100">
              <div className="border-bottom px-4 py-3">
                <h2 className="h5 fw-bold mb-1">Subir nuevo PDF</h2>
                <p className="text-muted small mb-0">
                  Al publicar, este archivo reemplaza el documento visible para los usuarios.
                </p>
              </div>

              <form className="p-4" onSubmit={handleSubmit}>
                <label
                  className="d-flex flex-column align-items-center justify-content-center text-center border border-2 rounded-3 bg-light p-4 mb-3"
                  htmlFor="pdf-file"
                  style={{
                    borderStyle: "dashed",
                    cursor: "pointer",
                    minHeight: "220px",
                  }}
                >
                  <FiUploadCloud size={42} className="text-primary mb-3" />
                  <span className="fw-semibold">
                    {archivo ? archivo.name : "Seleccionar documento PDF"}
                  </span>
                  <span className="text-muted small mt-1">
                    PDF hasta 50 MB
                  </span>
                </label>

                <input
                  ref={fileInputRef}
                  id="pdf-file"
                  type="file"
                  accept="application/pdf"
                  className="form-control d-none"
                  onChange={handleFileChange}
                />

                <div className="border rounded-3 p-3 mb-3">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold">Archivo seleccionado</div>
                      <div
                        className={`small ${
                          selectedFileValid || !archivo ? "text-muted" : "text-danger"
                        }`}
                      >
                        {selectedFileStatus}
                      </div>
                      {archivo && (
                        <div className="text-muted small mt-1">
                          {formatBytes(archivo.size)}
                        </div>
                      )}
                    </div>

                    {archivo && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={limpiarSeleccion}
                        aria-label="Quitar archivo seleccionado"
                      >
                        <FiX />
                      </button>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>Subiendo</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100">
                      <div
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
                  disabled={uploading || !selectedFileValid}
                >
                  <FiUploadCloud />
                  {uploading ? "Publicando..." : "Publicar documento"}
                </button>

                {mensaje && (
                  <div className={`alert alert-${mensaje.tipo} d-flex align-items-center gap-2 mt-3 mb-0`} role="alert">
                    {mensaje.tipo === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
                    <span>{mensaje.texto}</span>
                  </div>
                )}
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
