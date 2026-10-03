import jwt from 'jsonwebtoken';

export default function authenticatePage(requiredRoles = []) {
    return (req, res, next) => {
        try {
            const payload = jwt.verify(req.cookies.session_token, process.env.JWT_SECRET);
            req.userId = payload.sub;
            req.userRoles = payload.roles || [];
            if (requiredRoles.length && !req.userRoles.some(role => requiredRoles.includes(role))) {
                return res.status(403).render('error', { title: 'Acceso denegado', page: 'error', code: 403, message: 'Tu cuenta no tiene permisos para acceder a esta página.' });
            }
            next();
        } catch {
            res.clearCookie('session_token', { path: '/' });
            res.redirect('/signIn');
        }
    };
}
