import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import LoginForm from "./components/LoginForm";
import RegistrationForm from "./components/RegistrationForm";
import Inicial from "./pages/Inicial";
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
import PlanTest from "./components/PlanTest";
import PublicacionesPage from "./pages/PublicacionesPage";
import MasReproducidas from "./pages/MasReproducidas";
import PlaylistPropiaCRUD from "./pages/PlaylistPropiaCRUD";
import MiPlaylist from "./pages/MiPlaylist";
import MiPlaylistUser2 from "./pages/MiPlaylistUser2";
import MiPlaylistAdmin from "./pages/MiPlaylistAdmin";
import ListaCanciones from "./components/ListaCanciones";
import ListaCancionesUltimas from "./components/ListaCancionesUltimas";
import EditarMasReproducidas from "./pages/EditarMasReproducidas";
import UsuariosCrud from "./pages/UsuariosCRUD";

import { AuthProvider } from "./utils/AuthContext";
import { getToken } from "./utils/auth";
import { SocketProvider } from "./hooks/SocketContext";
import { QueueProvider } from "./hooks/QueueProvider";
import { ReproductorProvider } from "./hooks/ReproductorContext";
import VideoDefault from "./components/VideoDefault";

function App() {
  const [auth, setAuth] = useState({ isAuthenticated: false, rol: null, userId: null });

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);

        // 🔹 Verificar expiración del token
        if (decodedToken.exp * 1000 < Date.now()) {
          console.log("Token expirado, cerrando sesión...");
          localStorage.removeItem("token");
          setAuth({ isAuthenticated: false, rol: null, userId: null });
        } else {
          setAuth({
            isAuthenticated: true,
            rol: decodedToken.rol,
            userId: decodedToken.id || decodedToken.userId, // ajusta según tu backend
          });
        }
      } catch (error) {
        console.error("Error al decodificar el token", error);
        localStorage.removeItem("token");
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      }
    }
  }, []);

  return (
    // Descomenta si lo necesitas
    // <ReproductorProvider>
    <SocketProvider>
      <QueueProvider userId={auth.userId}>
        <AuthProvider>
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
                    <Route path="register-user" element={<UsuariosCrud />} />
                    <Route path="productos" element={<Productos />} />
                    <Route path="producto/:id" element={<ProductoDetalle />} />
                    <Route path="mas-reproducidas" element={<MasReproducidas />} />
                    <Route path="editar-mas-reproducidas" element={<EditarMasReproducidas />} />
                    <Route path="solicitudes" element={<SolicitudesPage />} />
                    <Route path="miplaylist" element={<PlaylistPropiaCRUD />} />
                    <Route path="playlist/:id" element={<MiPlaylist />} />
                    <Route path="video-default" element={<VideoDefault />} />
                  </Route>

                  <Route path="/playlistPopular/:id" element={<MiPlaylistAdmin />} />
                  <Route path="/mis-playlist/:id" element={<MiPlaylistUser2 />} />
                  <Route path="listacanciones" element={<ListaCanciones />} />
                  <Route path="ultimas-subidas" element={<ListaCancionesUltimas />} />
                  <Route path="test" element={<PublicacionesCrud />} />
                  <Route index element={<Inicial />} />
                  <Route path="/planes" element={<PlanTest />} />
                  <Route path="/login" element={<LoginForm setAuth={setAuth} />} />
                  <Route path="/registro" element={<RegistrationForm />} />
                  <Route path="/publicaciones" element={<PublicacionesPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </QueueProvider>
    </SocketProvider>
    // </ReproductorProvider>
  );
}

export default App;
