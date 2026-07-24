'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LeadFinderLockup, LeadFinderScannerTile, TzolkinMorphingTile } from '../components/brand/TzolkinLogo.js';
import { IntroAnimation } from '../components/brand/IntroAnimation.js';
import { EyeIcon, EyeOffIcon } from '../components/brand/UIIcons.js';
import { AuthGraphism } from '../components/brand/AuthGraphism.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const BRAZIL_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify'
  const [accountType, setAccountType] = useState('PJ'); // 'PJ' | 'PF'

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDocument, setRegDocument] = useState('');
  const [regUf, setRegUf] = useState('SP');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // OTP Code Verification State (6 Digits)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Common UI State
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const router = useRouter();

  // Handle OTP digit change
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'login') {
      setLoading(true);
      try {
        const payload = { password: loginPassword };
        if (loginEmail) payload.email = loginEmail;

        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Credenciais inválidas');
          return;
        }

        if (rememberMe) {
          localStorage.setItem('token', data.token);
        } else {
          sessionStorage.setItem('token', data.token);
        }
        router.push('/dashboard');
      } catch (err) {
        setError('Não foi possível conectar ao servidor backend');
      } finally {
        setLoading(false);
      }

    } else if (mode === 'register') {
      // Validate Passwords Match
      if (regPassword !== regConfirmPassword) {
        setError('As senhas não coincidem. Digite novamente.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            email: regEmail,
            password: regPassword,
            ...(regPhone ? { phone: regPhone } : {}),
            ...(regDocument ? { document: regDocument } : {}),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Não foi possível registrar a conta');
          return;
        }

        // Save token temporarily and transition to 6-digit OTP verification screen
        if (data.token) {
          if (rememberMe) {
            localStorage.setItem('token', data.token);
          } else {
            sessionStorage.setItem('token', data.token);
          }
        }
        setMode('verify');
        setSuccessMsg(`Código de 6 dígitos enviado para ${regEmail}`);

      } catch (err) {
        setError('Erro ao enviar cadastro. Tente novamente.');
      } finally {
        setLoading(false);
      }

    } else if (mode === 'verify') {
      const code = otp.join('');
      if (code.length < 6) {
        setError('Digite o código de 6 dígitos enviado ao seu e-mail.');
        return;
      }

      setLoading(true);
      setTimeout(() => {
        setSuccessMsg('E-mail verificado com sucesso! Acessando...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      }, 600);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#09090b', color: '#FAFAF7', fontFamily: 'var(--font-sans)' }}>
      {/* Intro Motion Animation */}
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}

      {/* Split Screen Container */}
      <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>

        {/* LEFT COLUMN (DESKTOP VIDEO / BRAND PANEL) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 56px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.03), transparent 70%)',
            position: 'relative',
          }}
          className="auth-hero-panel"
        >
          {/* Background graphism fills the entire hero panel */}
          <AuthGraphism />

          {/* Header Lockup */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* <LeadFinderLockup height={42} /> */}
          </div>

          {/* Hero Copy */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '48px 0',
          }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.25, color: '#FAFAF7', maxWidth: 480, marginBottom: 16 }}>
              Seu ICP ideal a um clique.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 460, lineHeight: 1.6 }}>
              Sem tráfego pago, sem criar conteúdo e sem postar vídeos. Com o Lead Finder, vai parecer que você está de <span style={{ color: '#8670ff', fontWeight: 600 }}>hack</span>.
            </p>
          </div>

          {/* Security Seal & Footer */}
          <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}>
              Tzolkin Enterprise © 2026
            </span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--success)' }} />
              Dev
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN (SIMPLIFIED FORMS & BUNDLE SELECTOR) */}
        <div
          style={{
            width: 520,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            background: '#09090b',
          }}
          className="auth-form-panel"
        >
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Header Lockup visible on Mobile */}
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center' }} className="mobile-only-header">
              <LeadFinderLockup height={36} />
            </div>

            {/* Mode Switcher Tabs (Entrar / Criar Conta) */}
            {mode !== 'verify' && (
              <div
                style={{
                  display: 'flex',
                  background: '#121215',
                  padding: 4,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 28,
                  border: '1px solid var(--border-primary)',
                }}
              >
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: mode === 'login' ? '#27272a' : 'transparent',
                    color: mode === 'login' ? '#FAFAF7' : 'var(--text-tertiary)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                >
                  Entrar na Conta
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: mode === 'register' ? '#27272a' : 'transparent',
                    color: mode === 'register' ? '#FAFAF7' : 'var(--text-tertiary)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                  onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                >
                  Criar Conta Grátis
                </button>
              </div>
            )}

            {/* Title & Subtitle */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
                {mode === 'login' && 'Acessar Plataforma'}
                {mode === 'register' && 'Criar Nova Conta'}
                {mode === 'verify' && 'Verificar E-mail'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {mode === 'login' && 'Digite suas credenciais ou use o Google'}
                {mode === 'register' && 'Selecione o tipo de conta (PJ / PF) e preencha os dados.'}
                {mode === 'verify' && `Digite o código de 6 dígitos enviado para ${regEmail}.`}
              </p>
            </div>

            {/* Notification Alerts */}
            {error && (
              <div
                style={{
                  color: 'var(--error)',
                  background: 'var(--error-soft)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  color: 'var(--success)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                {successMsg}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleAuthSubmit}>

              {/* REGISTER MODE */}
              {mode === 'register' && (
                <>
                  {/* BUNDLE SELECTOR (PJ vs PF) */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      Tipo de conta *
                    </label>
                    <select
                      className="input"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      style={{ cursor: 'pointer', background: '#18181b', color: '#FAFAF7' }}
                    >
                      <option value="PJ">Pessoa Jurídica (PJ / Empresa)</option>
                      <option value="PF">Pessoa Física (PF / Profissional Liberal)</option>
                    </select>
                  </div>

                  {/* FIELD 1: Name / Razão Social */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      {accountType === 'PJ' ? 'Razão social / Empresa *' : 'Nome completo *'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={accountType === 'PJ' ? 'Ex: Tzolkin Soluções LTDA' : 'Ex: Gustavo Silva'}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  {/* FIELD 2: Email Corporativo / Pessoal */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      {accountType === 'PJ' ? 'E-mail corporativo *' : 'E-mail pessoal *'}
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder={accountType === 'PJ' ? 'contato@empresa.com.br' : 'seuemail@gmail.com'}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* FIELD 3 & 4: CNPJ/CPF + UF Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                        {accountType === 'PJ' ? 'CNPJ' : 'CPF'}
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder={accountType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                        value={regDocument}
                        onChange={(e) => setRegDocument(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                        UF (Estado) *
                      </label>
                      <select
                        className="input"
                        value={regUf}
                        onChange={(e) => setRegUf(e.target.value)}
                        style={{ cursor: 'pointer', background: '#18181b', color: '#FAFAF7' }}
                      >
                        {BRAZIL_UFS.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* FIELD 5: Password typed twice */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      Senha *
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      Confirmar senha *
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Repita a mesma senha"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                    />
                    {regConfirmPassword && regPassword !== regConfirmPassword && (
                      <span style={{ fontSize: 11, color: 'var(--error)', marginTop: 4, display: 'block' }}>
                        ⚠️ As senhas não coincidem
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* LOGIN MODE */}
              {mode === 'login' && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label className="auth-label" style={{ display: 'block', marginBottom: 6 }}>
                      E-mail ou usuário
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="seuemail@empresa.com.br"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="auth-label">Senha *</label>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        className="input"
                        placeholder="Digite sua senha"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="eye-toggle"
                        aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span className={`eye-icon ${showLoginPassword ? 'eye-open' : 'eye-closed'}`}>
                          {showLoginPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#FAFAF7', cursor: 'pointer' }}
                    />
                    <label htmlFor="remember-me" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Lembrar deste dispositivo
                    </label>
                  </div>
                </>
              )}

              {/* VERIFY MODE (Classic 6-digit OTP Screen) */}
              {mode === 'verify' && (
                <div style={{ marginBottom: 24 }}>
                  <label className="auth-label" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                    Código de 6 dígitos *
                  </label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={otpRefs[index]}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        style={{
                          width: 46,
                          height: 54,
                          fontSize: 22,
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: 8,
                          background: '#18181b',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#FAFAF7',
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => alert('Código reenviado com sucesso!')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Não recebeu o código? Reenviar
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}
                disabled={loading || (mode === 'login' ? !loginPassword : (mode === 'register' ? (!regName || !regEmail || !regPassword || regPassword !== regConfirmPassword) : false))}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    {mode === 'login' ? 'Autenticando...' : (mode === 'register' ? 'Enviando...' : 'Verificando...')}
                  </>
                ) : (
                  mode === 'login' ? 'Entrar na plataforma' : (mode === 'register' ? 'Continuar cadastro' : 'Confirmar e acessar')
                )}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
