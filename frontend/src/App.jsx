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
import FavoritosPage from "./pages/FavoritosPage";
import PromocionesPage from "./pages/PromocionesPage";
import SidebarLayout from "./components/SidebarLayout";
import UsuariosPage from "./pages/UsuariosPage";
import SolicitudesCancion from "./pages/SolicitudCancion";
import ListaCanciones from "./components/ListaCanciones";
import PublicacionesCrud from "./pages/PublicacionesCrud";
import Productos from "./components/Productos";
import ProductoDetalle from "./components/ProductoDetalle";
import PlanTest from "./components/PlanTest";
import { AuthProvider } from "./utils/AuthContext";
import { getToken } from "./utils/auth";
import PublicacionesPage from "./pages/PublicacionesPage";
import ReproductorPage from "./pages/ReproductorPage";
import MasReproducidas from "./pages/MasReproducidas";
import SolicitudesPage from "./components/SolicitudesPage";

function App() {
  // 🔹 Estado global de autenticación
  const [auth, setAuth] = useState({ isAuthenticated: false, rol: null });

  useEffect(() => {
    // 🔹 Verificar si hay un token guardado
    const token = getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setAuth({ isAuthenticated: true, rol: decodedToken.rol });
      } catch (error) {
        console.error("Error al decodificar el token", error);
        localStorage.removeItem("token"); // Elimina el token si es inválido
        setAuth({ isAuthenticated: false, rol: null });
      }
    }
  }, []);
  //ccs

  return (
    <AuthProvider>
      <BrowserRouter>
        <div>
          {/* 🔹 Pasamos auth y setAuth a Navbar para manejar autenticación */}
          <main className="flex-grow w-full ">
            <Routes>
              <Route path="/" element={<SidebarLayout />}>
                <Route path="anuncios" element={<AnunciosCRUD />} />
                <Route path="canciones" element={<CancionesCRUD />} />
                <Route path="genero" element={<GeneroCRUD />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="promociones" element={<PromocionesPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="productos" element={<Productos />} />
                <Route path="producto/:id" element={<ProductoDetalle />} />
                <Route path="/mas-reproducidas" element={<MasReproducidas />} />
                <Route path="solicitudes" element={<SolicitudesPage />} />
              </Route>
              <Route path="favoritos" element={<FavoritosPage />} />
              {/* Son las funcionalidades de los botones */}
              <Route path="listacanciones" element={<ListaCanciones />} />
              <Route path="test" element={<PublicacionesCrud />} />

              <Route index="/" element={<Inicial />} />
              <Route path="/planes" element={<PlanTest />} />
              {/* 🔹 Pasamos setAuth a LoginForm para actualizar estado tras login */}
              <Route path="/login" element={<LoginForm setAuth={setAuth} />} />
              <Route path="/registro" element={<RegistrationForm />} />
              <Route path="/publicaciones" element={<PublicacionesPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
