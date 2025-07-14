import axios from "axios";
import { useState } from "react";
import { API_URL } from "../config"

function PromocionForm() {
  
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
  });

  const [fotos, setFotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length + fotos.length > 3) {
      setError("Solo puedes subir un máximo de 3 imágenes.");
      return;
    }

    setFotos((prev) => [...prev, ...files]);
    setPreviewUrls((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
    setError(null);
  };

  const handleRemoveImage = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const createPromocion = async (formData) => {
      const res = await axios.post(
        `${API_URL}/api/promociones`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return res.data;
    };

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("titulo", formData.titulo);
      formDataToSend.append("descripcion", formData.descripcion);
      fotos.forEach((file) => formDataToSend.append("fotos", file));

      createPromocion(formDataToSend); 
      setSuccess("Promoción registrada exitosamente.");
      setFormData({ titulo: "", descripcion: "" });
      setFotos([]);
      setPreviewUrls([]);
    } catch (error) {
      setError(
        error.response?.data?.message || "Error al registrar la promoción."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className="container mt-5">
  <div className="card shadow">
    <div className="card-body">
      <h2 className="card-title mb-4">Registrar Promoción</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="titulo" className="form-label">Título</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="descripcion" className="form-label">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            className="form-control"
            rows="3"
            required
          ></textarea>
        </div>

        <div className="mb-3">
          <label htmlFor="fotos" className="form-label">Subir Fotos (Máx: 3 JPG)</label>
          <input
            type="file"
            accept="image/jpeg"
            multiple
            onChange={handleFileChange}
            className="form-control"
          />
        </div>

        {previewUrls.length > 0 && (
          <div className="mb-4">
            <h5 className="fw-bold">Vista previa:</h5>
            <div className="row">
              {previewUrls.map((url, index) => (
                <div key={index} className="col-4 position-relative mb-2">
                  <img
                    src={url}
                    alt={`Vista previa ${index + 1}`}
                    className="img-thumbnail"
                    style={{ height: "100px", objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute top-0 end-0"
                    onClick={() => handleRemoveImage(index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading ? "Registrando..." : "Registrar Promoción"}
        </button>
      </form>
    </div>
  </div>
</div>

  );
}

export default PromocionForm;
