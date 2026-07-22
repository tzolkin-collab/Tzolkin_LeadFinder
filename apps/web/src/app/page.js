'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TzolkinLockup } from '../components/brand/TzolkinLogo.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');

    } catch (err) {
      setError('Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="gradient-bg" />

      <div style={{ width: '100%', maxWidth: 400, padding: 24, position: 'relative', zIndex: 1 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }} className="fade-in">
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
            <TzolkinLockup size={56} theme="dark" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>
            Plataforma de Acesso ao Decisor & Inteligência Comercial
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card" style={{ padding: 28 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}>
              Senha de acesso
            </label>
            <input
              id="password-input"
              type="password"
              className="input"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{ marginBottom: 20 }}
            />

            {error && (
              <div style={{
                background: 'var(--error-soft)',
                color: 'var(--error)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              id="login-button"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !password}
              style={{ width: '100%', padding: '12px 20px', fontSize: 15 }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="fade-in" style={{
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 12,
          marginTop: 32,
          animationDelay: '0.2s',
        }}>
          Sistema privado de prospecção
        </p>
      </div>
    </div>
  );
}
