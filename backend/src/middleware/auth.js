function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== process.env.AUTH_PASSWORD) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    next();
}

module.exports = authMiddleware;
