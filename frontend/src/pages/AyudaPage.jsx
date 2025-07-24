import React, { useState } from 'react';

const datosSistema = [
  {
    titulo: 'Cómo funciona el sistema',
    pdfUrl: '/pdfs/ayuda.pdf', // Ajusta esta ruta según tu estructura de carpetas públicas
  },
  // Puedes agregar más ítems aquí si deseas
];

const AyudaPage = () => {
  const [activo, setActivo] = useState(null);

  const toggle = (index) => {
    setActivo(activo === index ? null : index);
  };

  return (
    <div className="bg-primary p-2 m-2">
      <h3 className="text-white">Funcionamiento del Sistema</h3>

      <div
        className="border rounded p-2"
        style={{ maxHeight: '700px', overflowY: 'auto' }}
      >
        {datosSistema.map((item, index) => (
          <div key={index} className="mb-2">
            <button
              className="btn text-white w-100 text-start"
              onClick={() => toggle(index)}
              aria-expanded={activo === index}
            >
              {item.titulo}
            </button>

            <div className={`collapse ${activo === index ? 'show' : ''}`}>
                {item.pdfUrl && (
                  <iframe
                    src={item.pdfUrl}
                    title={`PDF-${index}`}
                    width="100%"
                    height="900px"
                    style={{ border: '1px solid #ccc' }}
                  />
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AyudaPage;
