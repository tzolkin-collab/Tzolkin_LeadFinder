const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Senha é obrigatória' });
    }

    if (password !== process.env.AUTH_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Return the password itself as the token (simple auth)
    res.json({
        success: true,
        token: process.env.AUTH_PASSWORD,
        message: 'Login realizado com sucesso',
    });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
    const { token } = req.body;

    if (token === process.env.AUTH_PASSWORD) {
        return res.json({ valid: true });
    }

    res.status(401).json({ valid: false });
});

module.exports = router;
