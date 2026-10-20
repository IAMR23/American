import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT ?? 3000);

try {
  await connectDatabase();

  app.listen(port, '0.0.0.0', () => {
    console.log(`BOOK STORE API disponible en el puerto ${port}`);
  });
} catch (error) {
  console.error('No fue posible iniciar la API:', error.message);
  process.exit(1);
}
