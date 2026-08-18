import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import LoginForm from "./components/LoginForm";
import RegistrationForm from "./components/RegistrationForm";
import Home from "./pages/Home";
import AnunciosCRUD from "./pages/AnunciosCrud";
import CancionesCRUD from "./pages/CancionesCrud";
import GeneroCRUD from "./pages/GeneroCrud";
import PromocionesPage from "./pages/PromocionesPage";
import SidebarLayout from "./components/SidebarLayout";
import UsuariosPage from "./pages/UsuariosPage";
import SolicitudesPage from "./components/SolicitudesPage";
import PublicacionesCrud from "./pages/PublicacionesCrud";
import Productos from "./components/Productos";
import ProductoDetalle from "./components/ProductoDetalle";
import PublicacionesPage from "./pages/PublicacionesPage";
import MasReproducidas from "./pages/MasReproducidas";
import PlaylistPropiaCRUD from "./pages/PlaylistPropiaCRUD";
import MiPlaylist from "./pages/MiPlaylist";
import MiPlaylistUser2 from "./pages/MiPlaylistUser2";
import MiPlaylistAdmin from "./pages/MiPlaylistAdmin";
import ListaCanciones from "./components/ListaCanciones";
import ListaCancionesUltimas from "./components/ListaCancionesUltimas";
import EditarMasReproducidas from "./pages/EditarMasReproducidas";

import { AuthProvider } from "./utils/AuthContext";
import {
  hasLogoutMarker,
  removeToken,
  saveToken,
  syncTokenWithBrowserState,
} from "./utils/auth";
import api from "./services/axiosConfig";
import { SocketProvider } from "./hooks/SocketContext";
import { QueueProvider } from "./hooks/QueueProvider";
import { ReproductorProvider } from "./hooks/ReproductorContext";
import PuntajeCrud from "./pages/PuntajeCrud";
import { BackgroundProvider } from "./hooks/BackgroundContext";
import ResetPassword from "./pages/ResetPassword";
import SubirPDF from "./pages/SubirPDF";
import SalaUsuario from "./pages/SalaUsuario";
import MesaUsuario from "./pages/MesaUsuario";
import ListadoPDFCanciones from "./components/ListadoPDFCanciones";
import { SubscriptionProvider } from "./utils/SubscriptionContext";
function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    rol: null,
    userId: null,
  });

  const [token, setToken] = useState(() => syncTokenWithBrowserState());


  useEffect(() => {
    if (!token) {
      setAuth({ isAuthenticated: false, rol: null, userId: null });
      return;
    }

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        removeToken({ markLogout: false });
        setToken(null);
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      } else {
        setAuth({
          isAuthenticated: true,
          rol: decoded.rol,
          userId: decoded.id || decoded.userId,
        });
      }
    } catch {
      removeToken({ markLogout: false });
      setToken(null);
      setAuth({ isAuthenticated: false, rol: null, userId: null });
    }
  }, [token]);

  useEffect(() => {
    const syncToken = (event) => {
      const currentToken = event.detail || syncTokenWithBrowserState();
      setToken(currentToken);

      if (!currentToken) {
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      }
    };

    const syncBrowserSession = () => {
      const currentToken = syncTokenWithBrowserState();
      setToken(currentToken);

      if (!currentToken) {
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      }
    };

    const syncVisibleSession = () => {
      if (!document.hidden) {
        syncBrowserSession();
      }
    };

    window.addEventListener("auth-token-changed", syncToken);
    window.addEventListener("pageshow", syncBrowserSession);
    window.addEventListener("focus", syncBrowserSession);
    window.addEventListener("storage", syncBrowserSession);
    document.addEventListener("visibilitychange", syncVisibleSession);

    return () => {
      window.removeEventListener("auth-token-changed", syncToken);
      window.removeEventListener("pageshow", syncBrowserSession);
      window.removeEventListener("focus", syncBrowserSession);
      window.removeEventListener("storage", syncBrowserSession);
      document.removeEventListener("visibilitychange", syncVisibleSession);
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (hasLogoutMarker()) {
        removeToken({ markLogout: false });
        setToken(null);
        setAuth({ isAuthenticated: false, rol: null, userId: null });
        return;
      }

      try {
        const response = await api.post("/api/auth/refresh");
        const refreshedToken = response.data?.accessToken || response.data?.token;

        if (refreshedToken) {
          saveToken(refreshedToken);
          setToken(refreshedToken);
        }
      } catch {
        removeToken({ markLogout: false });
        setToken(null);
      }
    };

    restoreSession();
  }, []);

      const roomId = localStorage.getItem("roomId");


  return (

    <BackgroundProvider>
      <SocketProvider>
        <SubscriptionProvider auth={auth} token={token}>
          <QueueProvider userId={auth.userId} roomId={roomId}>
            <BrowserRouter>
              <div>
                <main className="flex-grow w-full">
                  <Routes>
                    <Route path="/" element={<SidebarLayout />}>
                      <Route path="anuncios" element={<AnunciosCRUD />} />
                      <Route path="canciones" element={<CancionesCRUD />} />
                      <Route path="genero" element={<GeneroCRUD />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="promociones" element={<PromocionesPage />} />
                      <Route path="usuarios" element={<UsuariosPage />} />
                      <Route path="register-user" element={<UsuariosPage />} />
                      <Route path="productos" element={<Productos />} />
                      <Route path="producto/:id" element={<ProductoDetalle />} />
                                        <Route path="/subir-pdf" element={<SubirPDF/>} />

                      <Route
                        path="mas-reproducidas"
                        element={<MasReproducidas />}
                      />
                      <Route
                        path="editar-mas-reproducidas"
                        element={<EditarMasReproducidas />}
                      />
                      <Route path="solicitudes" element={<SolicitudesPage />} />
                      <Route path="miplaylist" element={<PlaylistPropiaCRUD />} />
                      <Route path="playlist/:id" element={<MiPlaylist />} />
                      <Route path="calificaciones" element={<PuntajeCrud />} />
                    </Route>

                    <Route
                      path="/playlistPopular/:id"
                      element={<MiPlaylistAdmin />}
                    />
                    <Route
                      path="/mis-playlist/:id"
                      element={<MiPlaylistUser2 />}
                    />
                    <Route path="listacanciones" element={<ListaCanciones />} />
                    <Route
                      path="ultimas-subidas"
                      element={<ListaCancionesUltimas />}
                    />
                    <Route path="test" element={<PublicacionesCrud />} />
                    <Route index element={<Home />} />
                    <Route
                      path="/login"
                      element={<LoginForm setToken={setToken} />}
                    />
                    {/* <Route path="/registro" element={<RegistrationForm />} /> */}
                    <Route
                      path="/publicaciones"
                      element={<PublicacionesPage />}
                    />

                    {/* Resest password */}
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/sala/:roomId" element={<SalaUsuario />} />
                    <Route path="/mesa/:roomId" element={<MesaUsuario />} />
                    <Route
                      path="/listado-pdf/cancion"
                      element={<ListadoPDFCanciones autoDownloadOrden="cancion" />}
                    />


                  </Routes>
                </main>

                <Footer />
              </div>
            </BrowserRouter>
          </QueueProvider>
        </SubscriptionProvider>
      </SocketProvider>
    </BackgroundProvider>
    // </ReproductorProvider>
  );
}

export default App;
