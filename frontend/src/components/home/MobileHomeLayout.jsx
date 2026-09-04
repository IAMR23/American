import { FaCompactDisc } from "react-icons/fa";

function MobileButton({
  children,
  className = "boton2",
  disabled,
  active,
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      className={`${className} home-mobile-control ${
        active ? "home-mobile-control-active" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function MobileHomeLayout({
  background,
  canUseSystem,
  user,
  showDashboard,
  isGuest,
  shouldShowSubscribeOption,
  hasToken,
  subscribeButtonRef,
  seccionActiva,
  setSeccionActiva,
  navigate,
  cerrarSesion,
  modoCalificacion,
  setModoCalificacion,
  modoConcursoEncendido,
  content,
  getColaVisible,
  currentIndex,
  handleCambiarCancion,
  limpiarCola,
}) {
  const isActive = (section) => seccionActiva === section;

  return (
    <div
      className="home-mobile-shell"
      style={{
        backgroundImage: background ? `url(${background})` : "none",
      }}
    >
      <header className="home-mobile-header">
        <img src="./icono.png" alt="icono" className="home-mobile-icon" />
        <button
          type="button"
          className="home-mobile-logo-button"
          onClick={() => setSeccionActiva("video")}
          aria-label="Ir al reproductor"
        >
          <img src="./logo.png" alt="American Karaoke" className="home-mobile-logo" />
        </button>
        {canUseSystem && user?.nombre && (
          <div className="home-mobile-user-panel text-center text-white">
            <span className="outlined-black home-mobile-user-title">
              Bienvenido:
            </span>
            <button
              type="button"
              className="home-mobile-user-button"
              onClick={() => setSeccionActiva("user")}
            >
              {user.nombre}
            </button>
          </div>
        )}
      </header>

      <nav className="home-mobile-top-actions" aria-label="Controles principales">
        {showDashboard && (
          <MobileButton onClick={() => navigate("/dashboard")}>Dashboard</MobileButton>
        )}

        <MobileButton
          className="boton1"
          disabled={!canUseSystem}
          active={isActive("buscador")}
          onClick={() => setSeccionActiva("buscador")}
        >
          Buscador
        </MobileButton>

        <MobileButton
          className="boton2"
          disabled={!canUseSystem}
          active={isActive("playlist")}
          onClick={() => setSeccionActiva("playlist")}
        >
          PlayList
        </MobileButton>

        <MobileButton
          className="boton7"
          disabled={!canUseSystem}
          onClick={() => navigate("/listaCanciones")}
        >
          Canciones
        </MobileButton>

        <button
          type="button"
          className={`boto home-mobile-image-button ${
            modoCalificacion ? "boto-activo home-mobile-control-active" : ""
          }`}
          disabled={!canUseSystem || modoConcursoEncendido}
          onClick={() => {
            if (modoConcursoEncendido) return;
            setModoCalificacion((prev) => !prev);
          }}
          aria-label="Modo calificacion"
        >
          <img src="./cal.png" alt="" />
        </button>

        <MobileButton
          className="boton1"
          disabled={!canUseSystem}
          active={isActive("ayuda")}
          onClick={() => setSeccionActiva("ayuda")}
        >
          Ayuda
        </MobileButton>
      </nav>

      <main className="home-mobile-content" aria-live="polite">
        {content}
      </main>

      <nav className="home-mobile-bottom-actions" aria-label="Navegacion karaoke">
        {isGuest && (
          <>
            <MobileButton
              className="boton8"
              active={isActive("ingresar")}
              onClick={() => setSeccionActiva("ingresar")}
            >
              Ingresar
            </MobileButton>
            <MobileButton
              className="boton7"
              active={isActive("registrar")}
              onClick={() => setSeccionActiva("registrar")}
            >
              Registrar
            </MobileButton>
          </>
        )}

        {shouldShowSubscribeOption && (
          <MobileButton
            className="boton2"
            active={isActive("suscribir")}
            onClick={() => setSeccionActiva("suscribir")}
          >
            <span ref={subscribeButtonRef}>Suscribir</span>
          </MobileButton>
        )}

        <MobileButton
          className="boton3"
          disabled={!canUseSystem}
          onClick={() => navigate("/ultimas-subidas")}
        >
          Lo último
        </MobileButton>

        <MobileButton
          className="boton9"
          disabled={!canUseSystem}
          active={isActive("listadoPdf")}
          onClick={() => setSeccionActiva("listadoPdf")}
        >
          Listado PDF
        </MobileButton>

        <MobileButton
          className="boton4"
          disabled={!canUseSystem}
          active={isActive("favoritos")}
          onClick={() => setSeccionActiva("favoritos")}
        >
          Favoritos
        </MobileButton>

        <MobileButton
          className="boton3"
          disabled={!canUseSystem}
          active={isActive("sugerirCanciones")}
          onClick={() => setSeccionActiva("sugerirCanciones")}
        >
          Sugerir
        </MobileButton>

        <MobileButton
          className="boton2"
          disabled={!canUseSystem}
          onClick={() => navigate("/publicaciones")}
        >
          Galería Otros
        </MobileButton>

        {hasToken && (
          <MobileButton className="boton3" onClick={cerrarSesion}>
            Cerrar Sesión
          </MobileButton>
        )}
      </nav>

      <section className="home-mobile-queue" aria-label="Canciones a la cola">
        <div className="home-mobile-queue-header">
          <span>Canciones a la cola</span>
          <button
            type="button"
            className="btn home-mobile-clear-queue"
            onClick={limpiarCola}
            disabled={!canUseSystem}
            aria-label="Limpiar cola"
          >
            <img src="/limpiar.png" alt="" />
          </button>
        </div>

        <div
          className={`home-mobile-queue-list ${
            getColaVisible().length > 8 ? "scrollable" : ""
          }`}
        >
          {getColaVisible().map(({ cancion, index }) => (
            <button
              key={`${cancion._id}-${index}`}
              type="button"
              className="home-mobile-song-button"
              disabled={!canUseSystem}
              onClick={() => {
                handleCambiarCancion(index);
                setSeccionActiva("video");
              }}
              title={`${cancion.titulo || ""} ${cancion.artista || ""}`.trim()}
            >
              <FaCompactDisc
                size={28}
                className={index === currentIndex ? "song-playing" : "text-primary"}
              />
              <span>{cancion.titulo}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
