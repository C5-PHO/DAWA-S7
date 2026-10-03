export function notFound(req, res) {
    if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Ruta no encontrada' });
    res.status(404).render('error', { title: 'Página no encontrada', page: 'error', code: 404,
        message: 'La página que buscas no existe. Revisa la dirección o vuelve al inicio.' });
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    if (err.code === 11000) return res.status(400).json({ message: 'El email ya se encuentra en uso' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Revisa los datos del usuario.' });
    const status = err.status || 500;
    if (status >= 500) console.error('Error del servidor:', err.message);
    const message = status >= 500 && req.app.get('env') === 'production' ? 'Error interno del servidor' : err.message || 'Error interno del servidor';
    res.status(status).json({ message });
}
