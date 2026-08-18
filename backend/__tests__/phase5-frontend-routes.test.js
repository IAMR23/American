const fs = require("fs");
const path = require("path");

describe("rutas QR frontend", () => {
  test("App.jsx conserva rutas de sala, mesa y PDF por cancion", () => {
    const appPath = path.join(__dirname, "..", "..", "frontend", "src", "App.jsx");
    const appSource = fs.readFileSync(appPath, "utf8");

    expect(appSource).toContain('path="/sala/:roomId"');
    expect(appSource).toContain('path="/mesa/:roomId"');
    expect(appSource).toContain('path="/listado-pdf/cancion"');
    expect(appSource).toContain("<MesaUsuario />");
    expect(appSource).toContain('autoDownloadOrden="cancion"');
  });
});
