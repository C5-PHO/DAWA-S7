import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import pagesRoutes from './routes/pages.routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const root = path.dirname(fileURLToPath(import.meta.url));

// Crear la aplicación no abre puertos ni conexiones: puede reutilizarse en pruebas.
export function createApp(config) {
    const app = express();
    app.disable('x-powered-by');
    app.set('view engine', 'ejs');
    app.set('views', path.join(root, 'views'));
    app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
    app.use(cookieParser());
    app.use(express.json({ limit: '100kb' }));
    app.use('/assets', express.static(path.join(root, 'public')));
    app.use('/materialize', express.static(path.join(root, '../node_modules/materialize-css/dist')));
    app.get('/health', (req, res) => res.json({ ok: true }));
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use(pagesRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
