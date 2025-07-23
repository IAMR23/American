import React, { useState } from 'react';

const datosSistema = [
  {
    titulo: 'Autenticación de usuarios',
    descripcion: ', asegurando que cada solicitud esté protegida.'
  },
  {
    titulo: 'Módulo de administración',
    descripcion: 'Los administradores pueden gestionar contenido, usuarios y reportes desde un panel privado.'
  },
  {
    titulo: 'Integración con servicios externos',
    descripcion: 'Se conecta con APIs de terceros como Vimeo y Firebase para ofrecer streaming y notificaciones.'
  },
  {
    titulo: 'Análisis de datos',
    descripcion: 'El sistema genera reportes con gráficos sobre el uso del sistema y la interacción de los usuarios.'
  }
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
        style={{ maxHeight: '300px', overflowY: 'auto' }}
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
              <div className="card card-body">
                {item.descripcion}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AyudaPage;
