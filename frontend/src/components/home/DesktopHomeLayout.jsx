import { FaCompactDisc } from "react-icons/fa";

export default function DesktopHomeLayout({
  background,
  canUseSystem,
  user,
  showDashboard,
  isGuest,
  shouldShowSubscribeOption,
  hasToken,
  subscribeButtonRef,
  setSeccionActiva,
  navigate,
  cerrarSesion,
  modoCalificacion,
  setModoCalificacion,
  modoMesaEncendido,
  modoConcursoEncendido,
  content,
  getColaVisible,
  currentIndex,
  handleCambiarCancion,
  limpiarCola,
}) {
  return (
    <div
      className="container-fluid px-2 px-md-4 py-3 d-flex flex-column align-items-center home-shell"
      style={{
        backgroundImage: background ? `url(${background})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
      }}
    >
      {canUseSystem && user && user.nombre && (
        <div className="home-user-panel home-user-panel--corner home-user-panel-desktop text-center text-white">
          <h3 className="outlined-black home-user-title">Bienvenido:</h3>

          <button onClick={() => setSeccionActiva("user")} className="boton0">
            {user.nombre}
          </button>
        </div>
      )}

      <div className="row align-items-center justify-content-center g-2 g-md-3 w-100 home-header">
        <div className="col-3 col-sm-2 col-md-1 d-flex justify-content-center">
          <img src="./icono.png" alt="icono" className="home-icon" />
        </div>

        <div className="col-9 col-sm-8 col-md-7 col-lg-6 d-flex justify-content-center">
          <img
            onClick={() => setSeccionActiva("video")}
            src="./logo.png"
            alt="logo"
            className="img-fluid home-logo"
          />
        </div>
      </div>

      <div className="container-fluid px-0">
        <div className="row g-3 justify-content-center home-main-row">
          <div className="col-12 col-lg-2 d-flex flex-column align-items-center home-sidebar home-sidebar-left">
            <div className="home-sidebar-actions">
              {showDashboard && (
                <button className="boton2" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </button>
              )}

              <button
                className="boton1"
                onClick={() => setSeccionActiva("buscador")}
                disabled={!canUseSystem}
              >
                Buscador
              </button>

              <button
                className="boton2"
                onClick={() => setSeccionActiva("playlist")}
                disabled={!canUseSystem}
              >
                PlayList
              </button>

              <button
                className="boton3"
                onClick={() => navigate("/ultimas-subidas")}
                disabled={!canUseSystem}
              >
                Lo último
              </button>

              <button
                className="boton4"
                onClick={() => setSeccionActiva("favoritos")}
                disabled={!canUseSystem}
              >
                Favoritos
              </button>

              <button
                onClick={() => navigate("/listaCanciones")}
                className="boton7"
                disabled={!canUseSystem}
              >
                Canciones
              </button>

              <button
                className="boton3"
                onClick={() => setSeccionActiva("sugerirCanciones")}
                disabled={!canUseSystem}
              >
                Sugerir
              </button>
            </div>
          </div>

          <div className="col-12 col-lg-8 home-center-column">
            <div className="justify-content-center home-content">{content}</div>
          </div>

          <div className="col-12 col-lg-2 d-flex flex-column align-items-center home-sidebar home-sidebar-right">
            <div className="home-sidebar-actions">
              {isGuest && (
                <>
                  <button
                    className="boton8"
                    onClick={() => setSeccionActiva("ingresar")}
                  >
                    Ingresar
                  </button>

                  <button
                    className="boton7"
                    onClick={() => setSeccionActiva("registrar")}
                  >
                    Registrar
                  </button>
                </>
              )}

              {shouldShowSubscribeOption && (
                <button
                  ref={subscribeButtonRef}
                  type="button"
                  className="boton2"
                  onClick={() => setSeccionActiva("suscribir")}
                  aria-label="Ver planes de suscripcion"
                >
                  Suscribir
                </button>
              )}

              <button
                className="boton9"
                onClick={() => setSeccionActiva("listadoPdf")}
                disabled={!canUseSystem}
              >
                Listado PDF
              </button>

              <button
                disabled={!canUseSystem || modoConcursoEncendido}
                onClick={() => {
                  if (modoConcursoEncendido) return;
                  setModoCalificacion((prev) => !prev);
                }}
                className={`boto ${modoCalificacion ? "boto-activo" : ""}`}
              >
                <img src="./cal.png" alt="" width={250} />
              </button>

              <button
                className="boton1"
                onClick={() => setSeccionActiva("ayuda")}
                disabled={!canUseSystem}
              >
                Ayuda
              </button>

              <button
                className="boton2"
                onClick={() => navigate("/publicaciones")}
                disabled={!canUseSystem}
              >
                Galería Otros
              </button>

              {hasToken && (
                <button className="boton3" onClick={cerrarSesion}>
                  Cerrar Sesión
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="home-bottom-actions">
          <button
            className="boton2"
            onClick={() => setSeccionActiva("Celular")}
            disabled={!canUseSystem}
          >
            Celular
          </button>

          <button
            className={`boto home-mode-button ${
              modoMesaEncendido ? "boto-activo" : ""
            }`}
            onClick={() => setSeccionActiva("mesas")}
            disabled={!canUseSystem}
          >
            <img src="./Botonmesas22.png" alt="Mesas" />
          </button>

          <button
            className={`boto home-mode-button ${
              modoConcursoEncendido ? "boto-activo" : ""
            }`}
            onClick={() => setSeccionActiva("concurso")}
            disabled={!canUseSystem || modoCalificacion}
          >
            <img src="./BotonConcurso22.png" alt="Concurso" />
          </button>
        </div>
      </div>

      <div className="m-2 w-100">
        <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 queue-panel">
          <h2 className="text-white queue-title">Canciones a la cola</h2>

          <div
            className={`cola-canciones ${
              getColaVisible().length > 8 ? "scrollable" : ""
            }`}
          >
            {getColaVisible().map(({ cancion, index }) => (
              <div
                key={`${cancion._id}-${index}`}
                onClick={() => {
                  if (!canUseSystem) return;
                  handleCambiarCancion(index);
                  setSeccionActiva("video");
                }}
                className="song-icon position-relative"
                style={{ cursor: canUseSystem ? "pointer" : "not-allowed" }}
              >
                <FaCompactDisc
                  size={40}
                  className={`mb-1 ${
                    index === currentIndex ? "song-playing" : "text-primary"
                  }`}
                />

                <div className="custom-tooltip">
                  <strong>{cancion.titulo}</strong>
                  <br />
                  <small>{cancion.artista}</small>
                </div>
              </div>
            ))}
          </div>

          <button className="btn" onClick={limpiarCola} disabled={!canUseSystem}>
            <img className="m-2" src="/limpiar.png" alt="" width={120} />
          </button>
        </div>
      </div>
    </div>
  );
}
