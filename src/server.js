import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import seedRoles from './utils/seedRoles.js';
import seedUsers from './utils/seedUsers.js';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pagesRoutes from './routes/pages.routes.js';
dotenv.config();

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
app.set('view engine', 'ejs');
app.set('views', path.join(root, 'views'));
app.use(cookieParser());
app.use('/assets', express.static(path.join(root, 'public')));
app.use('/materialize', express.static(path.join(root, '../node_modules/materialize-css/dist')));

// Habilitar CORS para todos
app.use(cors());

app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use(pagesRoutes);

// Validar estado del servidor
app.get('/health', (req, res) => res.status(200).json({ ok: true }));
app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Ruta no encontrada' });
    res.status(404).render('error', { title: 'Página no encontrada', page: 'error', code: 404, message: 'La página que buscas no existe. Revisa la dirección o vuelve al inicio.' });
});

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ message: 'El email ya se encuentra en uso' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { autoIndex: true })
    .then( async () => {
        console.log('Mongo connected');
        await seedRoles();
        await seedUsers();
        app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
    })
    .catch(err => {
        console.error('Error al conectar con Mongo:', err);
        process.exit(1);
    });

