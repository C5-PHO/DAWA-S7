import express from 'express';
import authenticatePage from '../middlewares/authenticatePage.js';

const router = express.Router();
router.get('/', (req, res) => res.redirect('/signIn'));
router.get('/signIn', (req, res) => res.render('auth', { title: 'Iniciar sesión', page: 'signIn' }));
router.get('/signUp', (req, res) => res.render('auth', { title: 'Crear cuenta', page: 'signUp' }));
router.get('/profile', authenticatePage(), (req, res) => res.render('profile', { title: 'Mi cuenta', page: 'profile' }));
router.get('/dashboard/user', authenticatePage(['user', 'admin']), (req, res) => res.render('dashboard', { title: 'Mi dashboard', page: 'user' }));
router.get('/dashboard/admin', authenticatePage(['admin']), (req, res) => res.render('dashboard', { title: 'Administración', page: 'admin' }));
router.get('/403', authenticatePage(), (req, res) => res.status(403).render('error', { title: 'Acceso denegado', page: 'error', code: 403, message: 'Tu cuenta no tiene permisos para acceder a esta página.' }));
router.post('/api/auth/signOut', (req, res) => { res.clearCookie('session_token', { path: '/' }); res.json({ ok: true }); });
export default router;
