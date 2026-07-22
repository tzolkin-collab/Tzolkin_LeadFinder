'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TzolkinLockup } from '../../components/brand/TzolkinLogo.js';
import {
  SettingsIcon,
  UserIcon,
  UsersIcon,
  StarIcon,
  CostsIcon,
  LegalIcon,
  LockIcon,
  DocumentIcon,
  TrashIcon,
  SearchIcon,
  TargetIcon,
  IdeaIcon,
  ActionsIcon
} from '../../components/brand/UIIcons.js';
import {
  GooglePlacesIcon,
  InstagramIcon,
  MetaAdsIcon,
  OpenAiIcon,
  WhatsAppIcon,
  StripeIcon
} from '../../components/brand/ServiceLogos.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('token');
  return null;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

const SECTIONS = [
  { id: 'profile', label: 'Perfil', icon: <UserIcon size={18} /> },
  { id: 'general', label: 'Geral', icon: <SettingsIcon size={18} /> },
  { id: 'upgrade', label: 'Upgrade', icon: <StarIcon size={18} /> },
  { id: 'costs', label: 'Transparência de Custos', icon: <CostsIcon size={18} /> },
  { id: 'team', label: 'Equipe e Permissões', icon: <UsersIcon size={18} /> },
  { id: 'support', label: 'Suporte', icon: <WhatsAppIcon size={18} /> },
  { id: 'legal', label: 'Legal', icon: <LegalIcon size={18} /> },
];

const ROLES = [
  { value: 'OWNER', label: 'Owner (Proprietário)' },
  { value: 'ADMIN', label: 'Admin (Gestor Comercial)' },
  { value: 'MEMBER', label: 'Member (SDR / Closer)' },
  { value: 'VIEWER', label: 'Viewer (Leitor)' },
];

function RoleBadge({ role }) {
  const normalized = (role || '').toUpperCase();
  const styles = {
    OWNER: { bg: 'rgba(250, 250, 247, 0.12)', color: '#FAFAF7', border: '1px solid rgba(250, 250, 247, 0.3)' },
    ADMIN: { bg: 'rgba(238, 0, 0, 0.1)', color: '#f87171', border: '1px solid rgba(238, 0, 0, 0.3)' },
    MEMBER: { bg: 'rgba(245, 166, 35, 0.1)', color: '#f5a623', border: '1px solid rgba(245, 166, 35, 0.3)' },
    VIEWER: { bg: 'rgba(110, 110, 104, 0.15)', color: '#6E6E68', border: '1px solid rgba(110, 110, 104, 0.3)' },
  };
  const s = styles[normalized] || styles.VIEWER;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 100, background: s.bg, color: s.color, border: s.border,
      letterSpacing: '0.02em',
    }}>
      {normalized}
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Profile Form State
  const [profile, setProfile] = useState({ name: '', email: '', currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // General (ICP, Proposta de Valor & AI Model) Form State
  const [general, setGeneral] = useState({
    name: '',
    icpNiche: '',
    icpRegion: '',
    icpDecisionMaker: '',
    icpPainPoints: '',
    valuePropHeadline: '',
    valuePropServices: '',
    valuePropDifferentials: '',
    selectedAiModel: 'gpt-4o-mini',
    subscriptionPlan: 'starter',
  });
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Plans & Upgrade State
  const [plansData, setPlansData] = useState({ currentPlan: 'starter', plans: [] });

  // Costs State
  const [costs, setCosts] = useState(null);

  // Team State
  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'MEMBER' });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadSettings = useCallback(async () => {
    const [profileRes, generalRes, plansRes, costsRes, usersRes] = await Promise.all([
      fetch(`${API_URL}/api/settings/profile`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/settings/general`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/settings/plans`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/settings/costs`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/settings/users`, { headers: authHeaders() }),
    ]);

    if (profileRes.status === 401) { router.push('/'); return null; }

    const [profileData, generalData, plansData, costsData, usersData] = await Promise.all([
      profileRes.json(),
      generalRes.json(),
      plansRes.json(),
      costsRes.json(),
      usersRes.json(),
    ]);

    return {
      profile: { name: profileData.name || '', email: profileData.email || '' },
      general: {
        name: generalData.name || '',
        icpNiche: generalData.icpNiche || '',
        icpRegion: generalData.icpRegion || '',
        icpDecisionMaker: generalData.icpDecisionMaker || '',
        icpPainPoints: generalData.icpPainPoints || '',
        valuePropHeadline: generalData.valuePropHeadline || '',
        valuePropServices: generalData.valuePropServices || '',
        valuePropDifferentials: generalData.valuePropDifferentials || '',
        selectedAiModel: generalData.selectedAiModel || 'gpt-4o-mini',
        subscriptionPlan: generalData.subscriptionPlan || 'starter',
      },
      plans: plansData,
      costs: costsData,
      users: usersData.users || [],
    };
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/users`, { headers: authHeaders() });
      if (res.status === 401) { router.push('/'); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    let mounted = true;
    loadSettings()
      .then((result) => {
        if (!mounted || !result) return;
        setProfile(p => ({ ...p, ...result.profile }));
        setGeneral(result.general);
        setPlansData(result.plans);
        setCosts(result.costs);
        setUsers(result.users);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Error loading settings:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [loadSettings, router]);

  // Handle Profile Save
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/profile`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`✗ ${data.error}`); return; }
      showToast('✓ Perfil atualizado com sucesso');
      setProfile(p => ({ ...p, currentPassword: '', newPassword: '' }));
    } catch (err) {
      showToast('✗ Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  // Handle General Settings Save
  async function handleSaveGeneral(e) {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/general`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          name: general.name,
          icpNiche: general.icpNiche,
          icpRegion: general.icpRegion,
          icpDecisionMaker: general.icpDecisionMaker,
          icpPainPoints: general.icpPainPoints,
          valuePropHeadline: general.valuePropHeadline,
          valuePropServices: general.valuePropServices,
          valuePropDifferentials: general.valuePropDifferentials,
          selectedAiModel: general.selectedAiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`✗ ${data.error}`); return; }
      showToast('✓ ICP, Proposta de Valor e Modelo de IA salvos com sucesso');
    } catch (err) {
      showToast('✗ Erro ao salvar configurações');
    } finally {
      setSavingGeneral(false);
    }
  }

  // Handle User Save
  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      const url = editingUser
        ? `${API_URL}/api/settings/users/${editingUser.id}`
        : `${API_URL}/api/settings/users`;
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(userForm),
      });

      const data = await res.json();
      if (!res.ok) { showToast(`✗ ${data.error}`); return; }

      showToast(`✓ Usuário ${editingUser ? 'atualizado' : 'criado'}`);
      setUserModal(false);
      fetchUsers();
    } catch (err) {
      showToast('✗ Erro ao salvar usuário');
    }
  }

  async function handleDeleteUser(user) {
    if (!confirm(`Remover o usuário "${user.name}"?`)) return;
    try {
      await fetch(`${API_URL}/api/settings/users/${user.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      showToast('✓ Usuário removido com sucesso');
      fetchUsers();
    } catch (err) {
      showToast('✗ Erro ao remover usuário');
    }
  }

  async function handleToggleUserActive(user) {
    try {
      await fetch(`${API_URL}/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !user.isActive }),
      });
      showToast(`✓ ${user.name} ${user.isActive ? 'desativado' : 'ativado'}`);
      fetchUsers();
    } catch (err) {
      showToast('✗ Erro ao atualizar status');
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="gradient-bg" />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} id="back-btn">
              ← Dashboard
            </button>
            <TzolkinLockup size={28} theme="dark" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-reviewed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plano {general.subscriptionPlan?.toUpperCase() || 'STARTER'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: 32, paddingBottom: 64, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32, alignItems: 'start' }}>

          {/* Sidebar Navigation */}
          <nav className="fade-in">
            <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  title: 'Conta & Agência',
                  items: [
                    { id: 'profile', label: 'Perfil Pessoal', icon: <UserIcon size={18} /> },
                    { id: 'general', label: 'Geral & IA', icon: <SettingsIcon size={18} /> },
                  ],
                },
                {
                  title: 'Plano & Infraestrutura',
                  items: [
                    { id: 'upgrade', label: 'Upgrade & Planos', icon: <StarIcon size={18} /> },
                    { id: 'costs', label: 'Transparência de Custos', icon: <CostsIcon size={18} /> },
                  ],
                },
                {
                  title: 'Equipe & Comunicação',
                  items: [
                    { id: 'team', label: 'Equipe & Permissões', icon: <UsersIcon size={18} />, badge: users.length > 0 ? `${users.length}` : null },
                    { id: 'support', label: 'Suporte Direct', icon: <WhatsAppIcon size={18} /> },
                  ],
                },
                {
                  title: 'Governança',
                  items: [
                    { id: 'legal', label: 'Documentos Legais', icon: <LegalIcon size={18} /> },
                  ],
                },
              ].map((group, groupIdx) => (
                <div key={groupIdx}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-tertiary)',
                    padding: '4px 12px 8px 12px',
                  }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.items.map(s => {
                      const isActive = section === s.id;
                      return (
                        <button
                          key={s.id}
                          id={`nav-${s.id}`}
                          onClick={() => setSection(s.id)}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(250, 250, 247, 0.08)' : 'transparent',
                            color: isActive ? 'var(--tzolkin-offwhite)' : 'var(--text-secondary)',
                            fontWeight: isActive ? 600 : 450,
                            fontSize: 13.5,
                            fontFamily: 'inherit',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'rgba(250, 250, 247, 0.04)';
                              e.currentTarget.style.color = 'var(--tzolkin-offwhite)';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          {/* Active Indicator Bar */}
                          {isActive && (
                            <span style={{
                              position: 'absolute',
                              left: 0,
                              top: '20%',
                              bottom: '20%',
                              width: 3,
                              borderRadius: '0 2px 2px 0',
                              background: 'var(--tzolkin-offwhite)',
                            }} />
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{s.icon}</span>
                            <span>{s.label}</span>
                          </div>
                          {s.badge && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 100,
                              background: isActive ? 'var(--tzolkin-offwhite)' : 'rgba(110, 110, 104, 0.2)',
                              color: isActive ? '#0A0A0A' : 'var(--text-secondary)',
                            }}>
                              {s.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Sidebar Tenant Card Footer */}
              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#0CCE6B',
                  boxShadow: '0 0 8px rgba(12, 206, 107, 0.4)',
                  flexShrink: 0,
                }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tzolkin-offwhite)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {general.name || 'Sua Agência'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Multitenant Ativo
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Panel Container */}
          <div className="fade-in" style={{ animationDelay: '0.05s' }}>

            {/* 1. PERFIL */}
            {section === 'profile' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Perfil Pessoal</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Gerencie suas credenciais de acesso e preferências da conta
                </p>

                <form onSubmit={handleSaveProfile} className="card">
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Nome Completo
                    </label>
                    <input
                      className="input"
                      value={profile.name}
                      onChange={e => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Seu nome"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      E-mail de Acesso
                    </label>
                    <input
                      className="input"
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      placeholder="email@suaempresa.com"
                      required
                    />
                  </div>

                  <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alterar Senha de Acesso</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Senha Atual
                        </label>
                        <input
                          className="input"
                          type="password"
                          placeholder="••••••••"
                          value={profile.currentPassword}
                          onChange={e => setProfile({ ...profile, currentPassword: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Nova Senha
                        </label>
                        <input
                          className="input"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={profile.newPassword}
                          onChange={e => setProfile({ ...profile, newPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                      {savingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. GERAL (ICP, PROPOSTA DE VALOR & MODELO DE IA) */}
            {section === 'general' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Geral & Inteligência Comercial</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Defina o Perfil de Cliente Ideal (ICP) e a Proposta de Valor da sua agência para personalizar as análises e abordagens geradas pela IA
                </p>

                <form onSubmit={handleSaveGeneral} style={{ display: 'grid', gap: 24 }}>
                  {/* Nome da Agência */}
                  <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Identidade da Empresa / Agência</h3>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Nome da Agência / Tenant
                      </label>
                      <input
                        className="input"
                        value={general.name}
                        onChange={e => setGeneral({ ...general, name: e.target.value })}
                        placeholder="Ex: Tzolkin Inteligência Comercial"
                        required
                      />
                    </div>
                  </div>

                  {/* Card 1: ICP (Perfil de Cliente Ideal - QUEM) */}
                  <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TargetIcon size={20} color="var(--tzolkin-offwhite)" /> ICP — Perfil de Cliente Ideal (Quem é o seu Alvo?)
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                      Mapeie as características do cliente perfeito para o qual sua equipe vende.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Nicho / Segmento Alvo
                        </label>
                        <input
                          className="input"
                          value={general.icpNiche}
                          onChange={e => setGeneral({ ...general, icpNiche: e.target.value })}
                          placeholder="Ex: Clínicas Médicas, Dentistas, Escritórios de Advocacia"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Região / Porte Alvo
                        </label>
                        <input
                          className="input"
                          value={general.icpRegion}
                          onChange={e => setGeneral({ ...general, icpRegion: e.target.value })}
                          placeholder="Ex: Capitais e regiões metropolitanas com 3 a 15 funcionários"
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Cargo dos Decisores Principais
                      </label>
                      <input
                        className="input"
                        value={general.icpDecisionMaker}
                        onChange={e => setGeneral({ ...general, icpDecisionMaker: e.target.value })}
                        placeholder="Ex: Diretor Clínico, Sócio Proprietário, Gerente de Operações"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Dores & Desafios Frequentes do Cliente
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        value={general.icpPainPoints}
                        onChange={e => setGeneral({ ...general, icpPainPoints: e.target.value })}
                        placeholder="Ex: Dependência de indicações boca a boca, falta de canal direto de agendamento, anúncios sem conversão, ausência de presença digital moderna no mobile"
                        style={{ resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>
                  </div>

                  {/* Card 2: PROPOSTA DE VALOR (O QUE OFERECE E COMO RESOLVE) */}
                  <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ActionsIcon size={20} color="var(--tzolkin-offwhite)" /> Proposta de Valor da Agência (O Que e Como Resolve)
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                      Defina a oferta, a promessa de transformação e os diferenciais que a IA utilizará no pitch de abordagem comercial.
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Promessa Principal de Valor (Headline de Vendas)
                      </label>
                      <input
                        className="input"
                        value={general.valuePropHeadline}
                        onChange={e => setGeneral({ ...general, valuePropHeadline: e.target.value })}
                        placeholder="Ex: Transformamos clínicas locais em autoridades digitais trazendo 3x mais agendamentos de consultas particulares"
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Serviços & Soluções Entregues
                      </label>
                      <textarea
                        className="input"
                        rows={2}
                        value={general.valuePropServices}
                        onChange={e => setGeneral({ ...general, valuePropServices: e.target.value })}
                        placeholder="Ex: Criação de Sites de Alta Conversão, Gestão de Anúncios Google/Meta Ads, SEO Local no Google Maps, Integração de Agendamento via WhatsApp"
                        style={{ resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Diferenciais Competitivos & Garantia
                      </label>
                      <input
                        className="input"
                        value={general.valuePropDifferentials}
                        onChange={e => setGeneral({ ...general, valuePropDifferentials: e.target.value })}
                        placeholder="Ex: Entrega em até 7 dias úteis, sem contrato de fidelidade, otimização diária com inteligência comercial"
                      />
                    </div>
                  </div>

                  {/* Modelo de IA (Transparência de Custos) */}
                  <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <OpenAiIcon size={20} /> Modelo de IA & Transparência de Custo por Dossiê
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                      Selecione o motor de Inteligência Artificial para análise e scoring dos leads:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {[
                        {
                          id: 'gpt-4o-mini',
                          name: 'GPT-4o-mini',
                          provider: 'OpenAI (Oficial)',
                          cost: '~$0.002 / análise',
                          desc: 'Ultra-rápido e econômico. Recomendado para grande volume de buscas.',
                          badge: 'Padrão Recomendado',
                        },
                        {
                          id: 'gpt-4o',
                          name: 'GPT-4o Omnimodal',
                          provider: 'OpenAI (Alta Precisão)',
                          cost: '~$0.015 / análise',
                          desc: 'Raciocínio profundo e análise semântica refinada de mídias.',
                          badge: 'Alta Precisão',
                        },
                        {
                          id: 'claude-3-5-sonnet',
                          name: 'Claude 3.5 Sonnet',
                          provider: 'Anthropic AI',
                          cost: '~$0.020 / análise',
                          desc: 'Excepcional em copywriting de vendas e personalização de pitch.',
                          badge: 'Copywriting Avançado',
                        },
                      ].map(model => (
                        <div
                          key={model.id}
                          onClick={() => setGeneral({ ...general, selectedAiModel: model.id })}
                          style={{
                            padding: 20,
                            borderRadius: 'var(--radius-lg)',
                            border: general.selectedAiModel === model.id ? '2px solid var(--tzolkin-offwhite)' : '1px solid var(--border-primary)',
                            background: general.selectedAiModel === model.id ? 'rgba(250, 250, 247, 0.05)' : 'var(--bg-input)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            flexDirection: 'column',
                            justify: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <span style={{ fontWeight: 650, fontSize: 15 }}>{model.name}</span>
                              {general.selectedAiModel === model.id && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'var(--tzolkin-offwhite)', color: '#0A0A0A' }}>
                                  SELECIONADO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>{model.provider}</div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                              {model.desc}
                            </p>
                          </div>
                          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Custo Estimado:</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>{model.cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingGeneral}>
                      {savingGeneral ? 'Salvando...' : 'Salvar Configurações Gerais'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. UPGRADE & PLANOS (ESTILO CLAUDE.AI CARDS) */}
            {section === 'upgrade' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Upgrade de Plano SaaS</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
                  Aumente seu volume de prospecção diária e desbloqueie recursos avançados de equipe e inteligência comercial
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, alignItems: 'stretch' }}>
                  {(plansData?.plans || []).map(plan => {
                    const isCurrent = plansData?.currentPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className="card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          border: plan.popular ? '2px solid var(--tzolkin-offwhite)' : '1px solid var(--border-primary)',
                          background: plan.popular ? 'rgba(250, 250, 247, 0.03)' : 'var(--bg-card)',
                        }}
                      >
                        {plan.popular && (
                          <div style={{
                            position: 'absolute', top: -12, right: 20,
                            background: 'var(--tzolkin-offwhite)', color: '#0A0A0A',
                            fontSize: 11, fontWeight: 700, padding: '2px 12px',
                            borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase',
                          }}>
                            Mais Popular
                          </div>
                        )}

                        <div>
                          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{plan.name}</h3>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24, minHeight: 40 }}>
                            {plan.tagline}
                          </p>

                          <div style={{ marginBottom: 28 }}>
                            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--tzolkin-offwhite)', lineHeight: 1 }}>
                              ${plan.priceMonthlyUsd}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 6 }}>/mês</span>
                            {plan.priceMonthlyBrl > 0 && (
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                (~R$ {plan.priceMonthlyBrl}/mês via Stripe)
                              </div>
                            )}
                          </div>

                          <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 20, marginBottom: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                              O que está incluído:
                            </div>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, padding: 0 }}>
                              {(plan.features || []).map((feat, i) => (
                                <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ color: 'var(--tzolkin-offwhite)', fontWeight: 700 }}>✓</span>
                                  {feat}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          {isCurrent ? (
                            <button className="btn btn-secondary" style={{ width: '100%', opacity: 0.8 }} disabled>
                              Plano Ativo
                            </button>
                          ) : plan.checkoutUrl ? (
                            <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%' }}>
                              Fazer Upgrade Agora
                            </a>
                          ) : (
                            <button className="btn btn-secondary" style={{ width: '100%' }}>
                              Plano Básico
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. TRANSPARÊNCIA DE CUSTOS (REVISADO) */}
            {section === 'costs' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Transparência de Custos & Uso</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Acompanhe em tempo real o volume de requisições e a estimativa transparente de custo por motor de infraestrutura
                </p>

                {costs ? (
                  <>
                    {/* Banner Custo Total */}
                    <div className="card" style={{
                      marginBottom: 24, padding: 28,
                      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(250, 250, 247, 0.08), transparent)',
                    }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Consumo Acumulado Estimado (Mês Atual)
                      </div>
                      <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--tzolkin-offwhite)', lineHeight: 1 }}>
                        ${costs.totalCostUSD.toFixed(3)} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-secondary)' }}>USD</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
                        Valores calculados com base nos preços de tabela pública dos provedores oficiais de API.
                      </div>
                    </div>

                    {/* Breakdown por Motor */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Detalhamento por Motor de Prospecção</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      {costs.costs && Object.keys(costs.costs).map((key) => {
                        const item = costs.costs[key];
                        return (
                          <div key={key} className="stat-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--tzolkin-offwhite)' }}>{item.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                ${item.costPerUnit}/unid
                              </span>
                            </div>
                            <div className="stat-value" style={{ fontSize: 32, marginBottom: 4 }}>
                              {item.count}
                            </div>
                            <div className="stat-label" style={{ marginBottom: 16 }}>
                              requisições executadas
                            </div>
                            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: 'var(--text-tertiary)' }}>Custo Parcial:</span>
                              <span style={{ fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>${item.totalCost.toFixed(3)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 16px' }} />
                    <p>Carregando dados de transparência de custos...</p>
                  </div>
                )}
              </div>
            )}

            {/* 5. EQUIPE & PERMISSÕES */}
            {section === 'team' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Gestão de Equipe</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                      Gerencie os membros da equipe e defina o nível de acesso ao tenant
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', role: 'MEMBER' }); setUserModal(true); }} id="add-user-btn">
                    + Adicionar Membro
                  </button>
                </div>

                {users.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
                      <UsersIcon size={40} color="var(--text-tertiary)" />
                    </div>
                    <h3>Nenhum membro cadastrado</h3>
                    <p>Adicione usuários para compartilhar o acesso ao painel de prospecção.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Função (Role)</th>
                          <th>Status</th>
                          <th>Criado em</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id}>
                            <td style={{ fontWeight: 500, color: 'var(--tzolkin-offwhite)' }}>{user.name}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user.email}</td>
                            <td><RoleBadge role={user.role} /></td>
                            <td>
                              <span
                                onClick={() => handleToggleUserActive(user)}
                                style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 10px',
                                  borderRadius: 100, cursor: 'pointer',
                                  background: user.isActive ? 'var(--success-soft)' : 'var(--error-soft)',
                                  color: user.isActive ? 'var(--success)' : 'var(--error)',
                                  border: user.isActive ? '1px solid rgba(12, 206, 107, 0.3)' : '1px solid rgba(238, 0, 0, 0.3)',
                                  transition: 'all var(--transition-fast)',
                                }}
                              >
                                {user.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingUser(user); setUserForm({ name: user.name, email: user.email, role: user.role }); setUserModal(true); }}>
                                  Editar
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user)}>
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 6. SUPORTE DIRECT */}
            {section === 'support' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Suporte Direct Tzolkin</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Atendimento direto com a equipe de engenharia e inteligência comercial Tzolkin
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <WhatsAppIcon size={22} /> Atendimento via WhatsApp
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                      Fale diretamente com nossa equipe de suporte e consultoria para tirar dúvidas sobre pesquisas e relatórios de IA.
                    </p>
                    <a
                      href="https://wa.me/5531999999999?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Tzolkin%20Lead%20Finder"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      Abrir WhatsApp de Suporte ↗
                    </a>
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <OpenAiIcon size={20} /> Wiki & Base de Conhecimento
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                      Acesse tutoriais, melhores práticas de prospecção ativa e engenharia de prompts da Tzolkin.
                    </p>
                    <button className="btn btn-secondary" style={{ width: '100%' }}>
                      Acessar Wiki Tzolkin ↗
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. LEGAL */}
            {section === 'legal' && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Documentos Legais</h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div className="card card-interactive" onClick={() => router.push('/settings/privacy-policy')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LockIcon size={20} color="var(--tzolkin-offwhite)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Política de Privacidade</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Como tratamos e protegemos os dados no Lead Finder</div>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>→</span>
                    </div>
                  </div>

                  <div className="card card-interactive" onClick={() => router.push('/settings/terms-of-use')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DocumentIcon size={20} color="var(--tzolkin-offwhite)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Termos de Uso</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Termos e condições do serviço SaaS</div>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>→</span>
                    </div>
                  </div>

                  <div className="card card-interactive" onClick={() => router.push('/settings/data-deletion')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--error-soft)', border: '1px solid rgba(238, 0, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrashIcon size={20} color="var(--error)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Exclusão de Dados</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Solicitação de cancelamento e remoção de dados</div>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>→</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* User Modal */}
      {userModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setUserModal(false)}>
          <div className="modal" id="user-modal">
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              {editingUser ? 'Editar Membro' : 'Novo Membro da Equipe'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              {editingUser ? 'Atualize as informações do membro' : 'Preencha os dados para criar uma conta de acesso ao painel'}
            </p>

            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Nome Completo
                </label>
                <input
                  className="input"
                  placeholder="Nome do membro"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  E-mail
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="membro@suaempresa.com"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Função (Role)
                </label>
                <select
                  className="input"
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUserModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!userForm.name.trim() || !userForm.email.trim()}>
                  {editingUser ? 'Salvar Alterações' : 'Criar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
