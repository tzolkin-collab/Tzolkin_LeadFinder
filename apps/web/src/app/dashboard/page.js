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

function ScoreCircle({ score }) {
    if (score == null) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    const cls = score >= 7 ? 'score-high' : score >= 4 ? 'score-medium' : 'score-low';
    return <span className={`score-circle ${cls}`}>{score}</span>;
}

function StatusBadge({ status }) {
    const map = {
        PENDING: { cls: 'badge-pending', label: 'Pendente' },
        REVIEWED: { cls: 'badge-reviewed', label: 'Analisado' },
        CONTACTED: { cls: 'badge-contacted', label: 'Contatado' },
        REJECTED: { cls: 'badge-rejected', label: 'Rejeitado' },
    };
    const s = map[status] || { cls: '', label: status || 'Sem análise' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export default function DashboardPage() {
    const router = useRouter();
    const [businesses, setBusinesses] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchModal, setSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (filter) params.set('status', filter);
            if (searchInput) params.set('search', searchInput);

            const [bizRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/api/businesses?${params}`, { headers: authHeaders() }),
                fetch(`${API_URL}/api/businesses/stats`, { headers: authHeaders() }),
            ]);

            if (bizRes.status === 401 || statsRes.status === 401) {
                localStorage.removeItem('token');
                router.push('/');
                return;
            }

            const bizData = await bizRes.json();
            const statsData = await statsRes.json();

            setBusinesses(bizData.businesses || []);
            setTotalPages(bizData.pagination?.totalPages || 1);
            setStats(statsData);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, filter, searchInput, router]);

    useEffect(() => {
        if (!getToken()) {
            router.push('/');
            return;
        }
        fetchData();
    }, [fetchData, router]);

    async function handleSearch(e) {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResult(null);

        try {
            const res = await fetch(`${API_URL}/api/search`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    query: searchQuery,
                    location: searchLocation ? { latitude: -23.55, longitude: -46.63 } : undefined,
                }),
            });

            const data = await res.json();
            setSearchResult(data);
            showToast(`✓ ${data.savedCount} negócios salvos`);
            fetchData();
        } catch (err) {
            setSearchResult({ error: 'Erro ao buscar' });
        } finally {
            setSearching(false);
        }
    }

    async function handleReview(bizId, bizName) {
        showToast(`Analisando ${bizName}...`);
        try {
            const res = await fetch(`${API_URL}/api/search/review/${bizId}`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const data = await res.json();
            
            if (!res.ok) {
                const errorMsg = data.error || 'Erro desconhecido';
                showToast(`✗ ${errorMsg}`);
                return;
            }

            showToast(`✓ ${bizName} analisado (Score: ${data.business?.report?.suitabilityScore || '?'}/10)`);
            fetchData();
        } catch (err) {
            console.error('Review error:', err);
            showToast(`✗ Erro de conexão com o servidor`);
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        router.push('/');
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
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border-primary)',
            }}>
                <div className="container" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 64,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #0070f3, #00a0ff)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>Lead Finder</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            id="new-search-btn"
                            className="btn btn-primary"
                            onClick={() => setSearchModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Encontrar Clientes
                        </button>
                        <button className="btn btn-ghost" onClick={() => router.push('/settings')} id="settings-btn" title="Configurações">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                        <button className="btn btn-ghost" onClick={handleLogout} id="logout-btn">Sair</button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="container" style={{ paddingTop: 32, paddingBottom: 64, position: 'relative', zIndex: 1 }}>
                {/* Stats */}
                {stats && (
                    <div className="fade-in" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 16,
                        marginBottom: 32,
                    }}>
                        <div className="stat-card">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total de negócios</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
                            <div className="stat-label">Pendentes</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.reviewed}</div>
                            <div className="stat-label">Analisados</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.contacted}</div>
                            <div className="stat-label">Contatados</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--text-tertiary)' }}>{stats.withoutReport}</div>
                            <div className="stat-label">Sem análise</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="fade-in" style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    animationDelay: '0.1s',
                }}>
                    <input
                        className="input"
                        placeholder="Buscar por nome, endereço..."
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                        style={{ maxWidth: 300 }}
                        id="filter-search"
                    />
                    <select
                        className="input"
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                        style={{ maxWidth: 180, cursor: 'pointer' }}
                        id="filter-status"
                    >
                        <option value="">Todos os status</option>
                        <option value="PENDING">Pendente</option>
                        <option value="REVIEWED">Analisado</option>
                        <option value="CONTACTED">Contatado</option>
                        <option value="REJECTED">Rejeitado</option>
                    </select>
                </div>

                {/* Business Table */}
                {businesses.length === 0 ? (
                    <div className="empty-state fade-in">
                        <div className="empty-state-icon">🔍</div>
                        <h3>Nenhum negócio encontrado</h3>
                        <p>Clique em &quot;Encontrar Clientes&quot; para buscar negócios sem website na sua região.</p>
                    </div>
                ) : (
                    <div className="fade-in" style={{ animationDelay: '0.15s' }}>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Categoria</th>
                                        <th>Nota</th>
                                        <th>Website</th>
                                        <th>Telefone</th>
                                        <th>Score IA</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {businesses.map((biz) => (
                                        <tr key={biz.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{biz.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                    {biz.address?.slice(0, 50)}{biz.address?.length > 50 ? '...' : ''}
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                {biz.category || '—'}
                                            </td>
                                            <td>
                                                {biz.rating ? (
                                                    <span style={{ color: 'var(--warning)' }}>
                                                        ★ {biz.rating} <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>({biz.reviewCount})</span>
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: '2px 8px',
                                                    borderRadius: 100,
                                                    background: biz.hasWebsite ? 'var(--success-soft)' : 'var(--error-soft)',
                                                    color: biz.hasWebsite ? 'var(--success)' : 'var(--error)',
                                                }}>
                                                    {biz.hasWebsite ? '✓ Sim' : '✗ Não'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{biz.phone || '—'}</td>
                                            <td>
                                                <ScoreCircle score={biz.report?.suitabilityScore} />
                                            </td>
                                            <td>
                                                <StatusBadge status={biz.report?.status} />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => router.push(`/business/${biz.id}`)}
                                                    >
                                                        Ver
                                                    </button>
                                                    {!biz.report && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleReview(biz.id, biz.name)}
                                                        >
                                                            Analisar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 8,
                                marginTop: 24,
                            }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    ← Anterior
                                </button>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    padding: '0 12px',
                                }}>
                                    {page} / {totalPages}
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Próxima →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Search Modal */}
            {searchModal && (
                <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSearchModal(false)}>
                    <div className="modal" id="search-modal">
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Encontrar Novos Clientes</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                            Busque negócios sem website na sua região via Google Places
                        </p>

                        <form onSubmit={handleSearch}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    O que procurar?
                                </label>
                                <input
                                    className="input"
                                    placeholder="Ex: restaurantes, salões de beleza, academias..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    id="search-query-input"
                                />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Localização (opcional)
                                </label>
                                <input
                                    className="input"
                                    placeholder="Ex: São Paulo, Belo Horizonte..."
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    id="search-location-input"
                                />
                            </div>

                            {searchResult && !searchResult.error && (
                                <div style={{
                                    background: 'var(--success-soft)',
                                    color: 'var(--success)',
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 13,
                                    marginBottom: 16,
                                }}>
                                    ✓ {searchResult.totalFound} encontrados, {searchResult.withoutWebsite} sem website, {searchResult.savedCount} salvos
                                </div>
                            )}

                            {searchResult?.error && (
                                <div style={{
                                    background: 'var(--error-soft)',
                                    color: 'var(--error)',
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 13,
                                    marginBottom: 16,
                                }}>
                                    {searchResult.error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setSearchModal(false); setSearchResult(null); }}
                                >
                                    Fechar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={searching || !searchQuery.trim()}
                                    id="search-submit-btn"
                                >
                                    {searching ? (
                                        <>
                                            <span className="spinner" />
                                            Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                            Buscar
                                        </>
                                    )}
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
