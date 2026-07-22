'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <div style={{ textAlign: 'center', marginBottom: 48 }} className="fade-in">
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0070f3, #00a0ff)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 0 30px rgba(0, 112, 243, 0.3)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Lead Finder</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Encontre potenciais clientes sem website
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
