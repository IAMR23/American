import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import catalogRouter from './routes/catalog.routes.js';
import userRouter from './routes/user.routes.js';
import adminRouter from './routes/admin.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR ?? 'uploads'), { maxAge: '7d', immutable: true }));

app.get('/', (_request, response) => {
  response.json({
    name: 'BOOK STORE API',
    version: '0.1.0',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/me', userRouter);
app.use('/api/admin', adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
