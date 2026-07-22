'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
    { id: 'general', label: 'Geral', icon: '⚙️' },
    { id: 'users', label: 'Usuários', icon: '👥' },
    { id: 'costs', label: 'Custos & Uso', icon: '💰' },
    { id: 'legal', label: 'Legal', icon: '📜' },
];

const ROLES = [
    { value: 'admin', label: 'Administrador' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Visualizador' },
];

function RoleBadge({ role }) {
    const colors = {
        admin: { bg: 'rgba(238, 0, 0, 0.1)', color: '#f87171' },
        editor: { bg: 'rgba(245, 166, 35, 0.1)', color: '#f5a623' },
        viewer: { bg: 'rgba(0, 112, 243, 0.1)', color: '#0070f3' },
    };
    const c = colors[role] || colors.viewer;
    return (
        <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px',
            borderRadius: 100, background: c.bg, color: c.color,
            textTransform: 'capitalize',
        }}>
            {role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Viewer'}
        </span>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const [section, setSection] = useState('general');
    const [users, setUsers] = useState([]);
    const [costs, setCosts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // User modal
    const [userModal, setUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', role: 'viewer' });

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

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

    const fetchCosts = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings/costs`, { headers: authHeaders() });
            if (res.status === 401) { router.push('/'); return; }
            const data = await res.json();
            setCosts(data);
        } catch (err) {
            console.error('Error fetching costs:', err);
        }
    }, [router]);

    useEffect(() => {
        if (!getToken()) { router.push('/'); return; }
        Promise.all([fetchUsers(), fetchCosts()]).finally(() => setLoading(false));
    }, [fetchUsers, fetchCosts, router]);

    function openCreateUser() {
        setEditingUser(null);
        setForm({ name: '', email: '', role: 'viewer' });
        setUserModal(true);
    }

    function openEditUser(user) {
        setEditingUser(user);
        setForm({ name: user.name, email: user.email, role: user.role });
        setUserModal(true);
    }

    async function handleSaveUser(e) {
        e.preventDefault();
        try {
            const url = editingUser
                ? `${API_URL}/api/settings/users/${editingUser.id}`
                : `${API_URL}/api/settings/users`;
            const method = editingUser ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method, headers: authHeaders(),
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) { showToast(`✗ ${data.error}`); return; }

            showToast(`✓ Usuário ${editingUser ? 'atualizado' : 'criado'}`);
            setUserModal(false);
            fetchUsers();
        } catch (err) {
            showToast('✗ Erro de conexão');
        }
    }

    async function handleDeleteUser(user) {
        if (!confirm(`Remover o usuário "${user.name}"?`)) return;
        try {
            await fetch(`${API_URL}/api/settings/users/${user.id}`, {
                method: 'DELETE', headers: authHeaders(),
            });
            showToast('✓ Usuário removido');
            fetchUsers();
        } catch (err) {
            showToast('✗ Erro ao remover');
        }
    }

    async function handleToggleActive(user) {
        try {
            await fetch(`${API_URL}/api/settings/users/${user.id}`, {
                method: 'PATCH', headers: authHeaders(),
                body: JSON.stringify({ active: !user.active }),
            });
            showToast(`✓ ${user.name} ${user.active ? 'desativado' : 'ativado'}`);
            fetchUsers();
        } catch (err) {
            showToast('✗ Erro ao atualizar');
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
                background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border-primary)',
            }}>
                <div className="container" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} id="back-btn">
                            ← Dashboard
                        </button>
                        <span style={{ color: 'var(--border-secondary)' }}>|</span>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>Configurações</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container" style={{ paddingTop: 32, paddingBottom: 64, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'start' }}>

                    {/* Sidebar */}
                    <nav className="fade-in">
                        <div className="card" style={{ padding: 8 }}>
                            {SECTIONS.map(s => (
                                <button
                                    key={s.id}
                                    id={`nav-${s.id}`}
                                    onClick={() => setSection(s.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        width: '100%', padding: '12px 16px', border: 'none',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                        background: section === s.id ? 'var(--accent-soft)' : 'transparent',
                                        color: section === s.id ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: section === s.id ? 600 : 400,
                                        fontSize: 14, fontFamily: 'inherit',
                                        transition: 'all var(--transition-fast)',
                                    }}
                                >
                                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Panel */}
                    <div className="fade-in" style={{ animationDelay: '0.05s' }}>
                        {/* GENERAL */}
                        {section === 'general' && (
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Geral</h2>
                                <div className="card" style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>📦</span> Informações do Aplicativo
                                    </h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nome</span>
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>Lead Finder</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Versão</span>
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>1.0.0</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Ambiente</span>
                                        <span className="badge badge-reviewed">Desenvolvimento</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Backend URL</span>
                                        <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{API_URL}</span>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>🔑</span> APIs Configuradas
                                    </h3>
                                    {[
                                        { name: 'Google Places API', status: true },
                                        { name: 'OpenAI (GPT-4o-mini)', status: true },
                                        { name: 'Serper.dev (Instagram)', status: true },
                                        { name: 'Meta Ads Library', status: true },
                                    ].map(api => (
                                        <div key={api.name} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 0', borderBottom: '1px solid var(--border-primary)',
                                        }}>
                                            <span style={{ fontSize: 14 }}>{api.name}</span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '3px 10px',
                                                borderRadius: 100,
                                                background: 'var(--success-soft)', color: 'var(--success)',
                                            }}>
                                                Configurada
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* USERS */}
                        {section === 'users' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h2 style={{ fontSize: 22, fontWeight: 700 }}>Usuários</h2>
                                    <button className="btn btn-primary" onClick={openCreateUser} id="add-user-btn">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Adicionar Usuário
                                    </button>
                                </div>

                                {users.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👥</div>
                                        <h3>Nenhum usuário cadastrado</h3>
                                        <p>Adicione usuários para gerenciar o acesso ao sistema.</p>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Nome</th>
                                                    <th>Email</th>
                                                    <th>Função</th>
                                                    <th>Status</th>
                                                    <th>Criado em</th>
                                                    <th>Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.id}>
                                                        <td style={{ fontWeight: 500 }}>{user.name}</td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user.email}</td>
                                                        <td><RoleBadge role={user.role} /></td>
                                                        <td>
                                                            <span
                                                                onClick={() => handleToggleActive(user)}
                                                                style={{
                                                                    fontSize: 11, fontWeight: 600, padding: '3px 10px',
                                                                    borderRadius: 100, cursor: 'pointer',
                                                                    background: user.active ? 'var(--success-soft)' : 'var(--error-soft)',
                                                                    color: user.active ? 'var(--success)' : 'var(--error)',
                                                                    transition: 'all var(--transition-fast)',
                                                                }}
                                                            >
                                                                {user.active ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                                                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button className="btn btn-secondary btn-sm" onClick={() => openEditUser(user)}>
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

                        {/* COSTS */}
                        {section === 'costs' && (
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Custos & Uso</h2>

                                {costs ? (
                                    <>
                                        {/* Total */}
                                        <div className="card" style={{
                                            marginBottom: 24, padding: 28,
                                            background: 'linear-gradient(135deg, rgba(0, 112, 243, 0.08), rgba(0, 160, 255, 0.04))',
                                            borderColor: 'rgba(0, 112, 243, 0.2)',
                                        }}>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                Custo Total Estimado
                                            </div>
                                            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                                                ${costs.totalCostUSD}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                                                Valores aproximados baseados nos preços das APIs
                                            </div>
                                        </div>

                                        {/* Individual costs */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                            {Object.values(costs.costs).map((item, i) => (
                                                <div key={i} className="stat-card">
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                                        {item.label}
                                                    </div>
                                                    <div className="stat-value" style={{ fontSize: 28 }}>
                                                        {item.count}
                                                    </div>
                                                    <div className="stat-label" style={{ marginBottom: 12 }}>
                                                        chamadas
                                                    </div>
                                                    <div style={{
                                                        padding: '8px 0', borderTop: '1px solid var(--border-primary)',
                                                        display: 'flex', justifyContent: 'space-between', fontSize: 13,
                                                    }}>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>
                                                            ${item.costPerUnit}/chamada
                                                        </span>
                                                        <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                                                            ${item.totalCost}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state">
                                        <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 16px' }} />
                                        <p>Carregando dados de custos...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LEGAL */}
                        {section === 'legal' && (
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Legal</h2>
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div
                                        className="card card-interactive"
                                        onClick={() => router.push('/settings/privacy-policy')}
                                        id="link-privacy"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 12,
                                                background: 'var(--accent-soft)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 24, flexShrink: 0,
                                            }}>
                                                🔒
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                                                    Política de Privacidade
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    Como coletamos, usamos e protegemos os dados dos usuários
                                                </div>
                                            </div>
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>→</span>
                                        </div>
                                    </div>

                                    <div
                                        className="card card-interactive"
                                        onClick={() => router.push('/settings/terms-of-use')}
                                        id="link-terms"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 12,
                                                background: 'var(--warning-soft)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 24, flexShrink: 0,
                                            }}>
                                                📋
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                                                    Termos de Uso
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    Condições para utilização do sistema Lead Finder
                                                </div>
                                            </div>
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>→</span>
                                        </div>
                                    </div>

                                    <div
                                        className="card card-interactive"
                                        onClick={() => router.push('/settings/data-deletion')}
                                        id="link-data-deletion"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 12,
                                                background: 'var(--error-soft)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 24, flexShrink: 0,
                                            }}>
                                                🗑️
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                                                    Exclusão de Dados
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    Instruções para remover seus dados e atividades
                                                </div>
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
                            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            {editingUser ? 'Atualize as informações do usuário' : 'Preencha os dados para criar um novo usuário'}
                        </p>

                        <form onSubmit={handleSaveUser}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Nome
                                </label>
                                <input
                                    className="input" id="user-name-input"
                                    placeholder="Nome completo"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Email
                                </label>
                                <input
                                    className="input" id="user-email-input"
                                    type="email" placeholder="email@exemplo.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Função
                                </label>
                                <select
                                    className="input" id="user-role-select"
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
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
                                <button
                                    type="submit" className="btn btn-primary" id="save-user-btn"
                                    disabled={!form.name.trim() || !form.email.trim()}
                                >
                                    {editingUser ? 'Salvar' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
