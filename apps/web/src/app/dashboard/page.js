'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header.js';
import { TzolkinLoader } from '../../components/brand/TzolkinLogo.js';
import { WhatsAppIcon } from '../../components/brand/ServiceLogos.js';
import {
    CheckIcon,
    CrossIcon,
    SearchIcon,
    TargetIcon,
    StarIcon,
    SparklesIcon
} from '../../components/brand/UIIcons.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function ensureToken() {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token && process.env.NODE_ENV === 'development') {
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@tzolkin.com.br', password: 'admin123' }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    token = data.token;
                }
            }
        } catch (err) {
            console.warn('[DevAutoAuth] Could not auto-authenticate in dev mode:', err);
        }
    }
    return token;
}

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
    };
}

function ScoreCircle({ score }) {
    if (score == null) return <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>—</span>;
    const cls = score >= 7 ? 'score-high' : score >= 4 ? 'score-medium' : 'score-low';
    return <span className={`score-circle ${cls}`}>{score}</span>;
}

function StatusBadge({ status }) {
    const map = {
        PENDING: { cls: 'badge-pending', label: 'Garimpado' },
        REVIEWED: { cls: 'badge-reviewed', label: 'Qualificado' },
        CONTACTED: { cls: 'badge-contacted', label: 'Em Cadência' },
        REJECTED: { cls: 'badge-rejected', label: 'Arquivado' },
    };
    const s = map[status] || { cls: '', label: status || 'Sem análise' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

async function safeFetch(url, options) {
    try {
        return await fetch(url, options);
    } catch (err) {
        console.warn(`[SafeFetch] Failed to fetch ${url}:`, err);
        return {
            ok: false,
            status: 503,
            json: async () => ({}),
        };
    }
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam === 'outbound' ? 'outbound' : 'prospecting');

    const [businesses, setBusinesses] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    // Search / Discovery Modal (Sniper vs Garimpo em Lote)
    const [searchModal, setSearchModal] = useState(false);
    const [searchMode, setSearchMode] = useState('sniper'); // 'sniper' | 'batch'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(true);
    const [maxResults, setMaxResults] = useState(50);
    const [sniperAutoReview, setSniperAutoReview] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [sniperTarget, setSniperTarget] = useState(null);

    // Pagination & Filtering
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [toast, setToast] = useState(null);

    // activeTab is initialized from tabParam; Header and switcher keep it in sync.

    const showToast = (msg, isError = false) => {
        setToast({ message: msg, isError });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = useCallback(async () => {
        const params = new URLSearchParams({ page, limit: 30 });
        if (filter) params.set('status', filter);
        if (searchInput) params.set('search', searchInput);

        try {
            const [bizRes, statsRes] = await Promise.all([
                safeFetch(`${API_URL}/api/businesses?${params}`, { headers: authHeaders() }),
                safeFetch(`${API_URL}/api/businesses/stats`, { headers: authHeaders() }),
            ]);

            if (bizRes.status === 401 || statsRes.status === 401) {
                localStorage.removeItem('token');
                router.push('/');
                return null;
            }

            const bizData = bizRes.ok ? await bizRes.json() : { businesses: [], pagination: { totalPages: 1 } };
            const statsData = statsRes.ok ? await statsRes.json() : null;

            return {
                businesses: bizData.businesses || [],
                totalPages: bizData.pagination?.totalPages || 1,
                stats: statsData,
            };
        } catch (err) {
            console.error('Failed to fetch dashboard data from API:', err);
            return {
                businesses: [],
                totalPages: 1,
                stats: null,
            };
        }
    }, [page, filter, searchInput]);

    useEffect(() => {
        let mounted = true;

        async function initializeDashboard() {
            const token = await ensureToken();
            if (!token) {
                router.push('/');
                return;
            }
            try {
                const result = await loadData();
                if (!mounted || !result) return;
                setBusinesses(result.businesses);
                setTotalPages(result.totalPages);
                setStats(result.stats);
            } catch (err) {
                if (!mounted) return;
                console.error('Fetch error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initializeDashboard();
        return () => { mounted = false; };
    }, [loadData]);

    async function handleSearch(e) {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResult(null);
        setSniperTarget(null);

        try {
            const isSniper = searchMode === 'sniper';
            const payload = {
                query: searchQuery,
                location: searchLocation ? searchLocation : undefined,
                onlyWithoutWebsite: isSniper ? false : onlyWithoutWebsite,
                maxResults: isSniper ? 1 : maxResults,
            };

            const res = await fetch(`${API_URL}/api/search`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setSearchResult({ error: data.error || 'Erro ao realizar busca' });
                return;
            }

            setSearchResult(data);

            if (isSniper && data.businesses && data.businesses.length > 0) {
                const target = data.businesses[0];
                setSniperTarget(target);
                showToast(`🎯 Alvo localizado: ${target.name}`);

                if (sniperAutoReview) {
                    showToast(`🤖 Gerando Dossiê Comercial IA para ${target.name}...`);
                    try {
                        const revRes = await fetch(`${API_URL}/api/search/review/${target.id}`, {
                            method: 'POST',
                            headers: authHeaders(),
                        });
                        if (revRes.ok) {
                            const revData = await revRes.json();
                            if (revData.business) setSniperTarget(revData.business);
                            showToast(`✨ Dossiê concluído para ${target.name}`);
                        }
                    } catch (revErr) {
                        console.warn('Sniper auto-review failed:', revErr);
                    }
                }
            } else {
                showToast(`${data.savedCount} novos negócios adicionados à prospecção`);
            }

            loadData().then((result) => {
                if (result) {
                    setBusinesses(result.businesses);
                    setTotalPages(result.totalPages);
                    setStats(result.stats);
                }
            });
        } catch (err) {
            setSearchResult({ error: 'Erro de comunicação com o servidor' });
        } finally {
            setSearching(false);
        }
    }

    async function handleReview(bizId, bizName) {
    showToast(`Gerando análise para ${bizName}...`);
    try {
        const res = await fetch(`${API_URL}/api/search/review/${bizId}`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();

        if (!res.ok) {
            const errorMsg = data.error || 'Erro desconhecido';
            showToast(errorMsg, true);
            return;
        }

        showToast(`${bizName} analisado (Score ICP: ${data.business?.report?.suitabilityScore || '?'}/10)`);
        loadData().then((result) => {
            if (result) {
                setBusinesses(result.businesses);
                setTotalPages(result.totalPages);
                setStats(result.stats);
            }
        });
    } catch (err) {
        console.error('Review error:', err);
        showToast('Erro de conexão com o servidor', true);
    }
}

async function handleStatusChange(bizId, newStatus) {
    try {
        const res = await fetch(`${API_URL}/api/businesses/${bizId}/status`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
            showToast('Erro ao atualizar status', true);
            return;
        }

        const statusLabels = {
            CONTACTED: 'Movido para Em Cadência',
            REVIEWED: 'Movido para Qualificado',
            REJECTED: 'Arquivado',
            PENDING: 'Movido para Prospecção'
        };

        showToast(statusLabels[newStatus] || 'Status atualizado');

        loadData().then((result) => {
            if (result) {
                setBusinesses(result.businesses);
                setTotalPages(result.totalPages);
                setStats(result.stats);
            }
        });
    } catch (err) {
        showToast('Erro de conexão ao alterar status', true);
    }
}

const handleOpenWhatsApp = (biz) => {
    let phoneNum = (biz.phone || '').replace(/\D/g, '');
    if (phoneNum && !phoneNum.startsWith('55') && phoneNum.length <= 11) {
        phoneNum = '55' + phoneNum;
    }

    if (!phoneNum) {
        showToast('Sem telefone cadastrado para este lead', true);
        return;
    }

    const msg = `Olá! Vi o destaque do ${biz.name} em ${biz.category || 'seu segmento'} no Google (${biz.rating ? biz.rating + ' estrelas' : 'boa avaliação'}). Gostaria de apresentar uma proposta rápida de presença digital de alta conversão. Podemos conversar?`;
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    if (biz.report?.status !== 'CONTACTED') {
        handleStatusChange(biz.id, 'CONTACTED');
    }
};

// Subsets for Outbound Pipeline
const outboundReadyLeads = businesses.filter(b => b.report?.status === 'REVIEWED' || (b.report?.suitabilityScore && b.report.suitabilityScore >= 6 && b.report.status !== 'CONTACTED' && b.report.status !== 'REJECTED'));
const outboundContactedLeads = businesses.filter(b => b.report?.status === 'CONTACTED');
const outboundRejectedLeads = businesses.filter(b => b.report?.status === 'REJECTED');

if (loading) {
    return (
        <div className="page">
            <TzolkinLoader />
        </div>
    );
}

return (
    <div className="page">
        <div className="gradient-bg" />

        {/* Header */}
        <Header
            onOpenSearch={() => setSearchModal(true)}
            activeTab={activeTab}
            onTabChange={(tab) => {
                setActiveTab(tab);
                router.push(`/dashboard?tab=${tab}`, { scroll: false });
            }}
        />

        {/* Main Container */}
        <main className="container" style={{ paddingTop: 32, paddingBottom: 80, position: 'relative', zIndex: 10 }}>

            {/* Header Switcher */}
            <div className="fade-in" style={{ marginBottom: 28 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                    borderBottom: '1px solid var(--border-primary)',
                    paddingBottom: 20,
                }}>
                    <div>
                        <span className="eyebrow" style={{ marginBottom: 6, fontWeight: 500 }}>
                            Plataforma B2B
                        </span>
                        <h1 className="tzolkin-title" style={{ fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 600 }}>
                            {activeTab === 'prospecting' ? 'Prospecção & Garimpo' : 'Outbound & Cadência'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, maxWidth: 580 }}>
                            {activeTab === 'prospecting'
                                ? 'Identificação de empresas locais sem website via Google Places e qualificação comercial com inteligência de dados.'
                                : 'Gestão da fila de abordagem ativa, cadência de prospecção direta e acompanhamento de conversão.'}
                        </p>
                    </div>

                    {/* Minimal Segmented Switcher */}
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-primary)' }}>
                        <button
                            onClick={() => { setActiveTab('prospecting'); router.push('/dashboard?tab=prospecting', { scroll: false }); }}
                            className={`btn ${activeTab === 'prospecting' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '6px 16px', fontSize: 12 }}
                        >
                            Prospecção
                        </button>
                        <button
                            onClick={() => { setActiveTab('outbound'); router.push('/dashboard?tab=outbound', { scroll: false }); }}
                            className={`btn ${activeTab === 'outbound' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '6px 16px', fontSize: 12 }}
                        >
                            Outbound
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: PROSPECÇÃO                                                         */}
            {/* ========================================================================= */}
            {activeTab === 'prospecting' && (
                <div className="fade-in">
                    {/* Metrics Grid */}
                    {stats && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 16,
                            marginBottom: 28,
                        }}>
                            <div className="stat-card">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Rastreado</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--error)' }}>{stats.withoutWebsite}</div>
                                <div className="stat-label">Sem Website</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.reviewed}</div>
                                <div className="stat-label">Qualificados</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
                                <div className="stat-label">Aguardando Análise</div>
                            </div>
                        </div>
                    )}

                    {/* Search & Action Bar */}
                    <div className="card" style={{
                        padding: '14px 20px',
                        marginBottom: 24,
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260 }}>
                            <input
                                className="input"
                                placeholder="Pesquisar empresa, categoria ou endereço..."
                                value={searchInput}
                                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                                style={{ maxWidth: 340 }}
                                id="prospecting-search-input"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[
                                    { value: '', label: 'Todos' },
                                    { value: 'PENDING', label: 'Pendentes' },
                                    { value: 'REVIEWED', label: 'Qualificados' },
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => { setFilter(item.value); setPage(1); }}
                                        className={`btn btn-sm ${filter === item.value ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setSearchModal(true)}
                            >
                                <SearchIcon size={14} color="#0A0A0A" />
                                + Nova Busca em Lote
                            </button>
                        </div>
                    </div>

                    {/* Prospecting Table */}
                    {businesses.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
                            <div style={{ marginBottom: 16, display: 'inline-flex', justifyContent: 'center' }}>
                                <TargetIcon size={36} color="var(--text-tertiary)" />
                            </div>
                            <h3 className="tzolkin-title" style={{ fontSize: 18, marginBottom: 6, fontWeight: 600 }}>Nenhum negócio no radar</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 420, margin: '0 auto 20px' }}>
                                Inicie uma busca automatizada via Google Places para captar empresas locais sem website.
                            </p>
                            <button className="btn btn-primary btn-sm" onClick={() => setSearchModal(true)}>
                                <SearchIcon size={14} color="#0A0A0A" />
                                Iniciar Garimpo ↗
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Empresa & Endereço</th>
                                            <th>Categoria</th>
                                            <th>Avaliação</th>
                                            <th>Website</th>
                                            <th>Score ICP</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {businesses.map((biz) => (
                                            <tr key={biz.id}>
                                                <td>
                                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{biz.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                        {biz.address?.slice(0, 50)}{biz.address?.length > 50 ? '...' : ''}
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                    {biz.category || '—'}
                                                </td>
                                                <td>
                                                    {biz.rating ? (
                                                        <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            <StarIcon size={11} color="var(--warning)" /> {biz.rating} <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>({biz.reviewCount})</span>
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${biz.hasWebsite ? 'badge-contacted' : 'badge-rejected'}`}>
                                                        {biz.hasWebsite ? <CheckIcon size={10} color="var(--success)" /> : <CrossIcon size={10} color="var(--error)" />}
                                                        {biz.hasWebsite ? 'Com site' : 'Sem site'}
                                                    </span>
                                                </td>
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
                                                            Dossiê ↗
                                                        </button>

                                                        {!biz.report ? (
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleReview(biz.id, biz.name)}
                                                            >
                                                                <SparklesIcon size={12} color="#0A0A0A" />
                                                                Qualificar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    handleStatusChange(biz.id, 'REVIEWED');
                                                                    setActiveTab('outbound');
                                                                }}
                                                            >
                                                                Outbound →
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
                                    justify: 'center',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginTop: 28,
                                }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        ← Anterior
                                    </button>
                                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                                        Página {page} de {totalPages}
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
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: OUTBOUND                                                           */}
            {/* ========================================================================= */}
            {activeTab === 'outbound' && (
                <div className="fade-in">
                    {/* Outbound KPI Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 16,
                        marginBottom: 28,
                    }}>
                        <div className="stat-card">
                            <div className="stat-value">{outboundReadyLeads.length}</div>
                            <div className="stat-label">Prontos p/ Abordagem</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--success)' }}>{outboundContactedLeads.length}</div>
                            <div className="stat-label">Em Cadência</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">
                                {stats?.total ? `${Math.round((outboundContactedLeads.length / stats.total) * 100)}%` : '0%'}
                            </div>
                            <div className="stat-label">Taxa de Abordagem</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--text-tertiary)' }}>{outboundRejectedLeads.length}</div>
                            <div className="stat-label">Arquivados</div>
                        </div>
                    </div>

                    {/* Clean Pipeline Columns */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 16,
                        alignItems: 'start',
                    }}>
                        {/* COLUMN 1: PRONTOS PARA ABORDAR */}
                        <div className="card" style={{ padding: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--warning)' }} />
                                    <span className="eyebrow" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                                        Prontos para abordar
                                    </span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {outboundReadyLeads.length}
                                </span>
                            </div>

                            {outboundReadyLeads.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 8px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                                    Nenhum lead qualificado pendente de contato.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {outboundReadyLeads.map((biz) => (
                                        <div
                                            key={biz.id}
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 14,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{biz.name}</div>
                                                <ScoreCircle score={biz.report?.suitabilityScore} />
                                            </div>

                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                                {biz.category || 'PME'} {biz.phone ? `· ${biz.phone}` : ''}
                                            </div>

                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                                    onClick={() => handleOpenWhatsApp(biz)}
                                                >
                                                    <WhatsAppIcon size={13} />
                                                    WhatsApp Web ↗
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => router.push(`/business/${biz.id}`)}
                                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                                >
                                                    Dossiê
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COLUMN 2: EM CADÊNCIA */}
                        <div className="card" style={{ padding: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--success)' }} />
                                    <span className="eyebrow" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                                        Em cadência
                                    </span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {outboundContactedLeads.length}
                                </span>
                            </div>

                            {outboundContactedLeads.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 8px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                                    Nenhum lead em cadência no momento.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {outboundContactedLeads.map((biz) => (
                                        <div
                                            key={biz.id}
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 14,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{biz.name}</div>
                                                <StatusBadge status="CONTACTED" />
                                            </div>

                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                                {biz.category}
                                            </div>

                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                                    onClick={() => handleOpenWhatsApp(biz)}
                                                >
                                                    <WhatsAppIcon size={12} />
                                                    Reabordar
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: 'var(--error)', padding: '6px 10px', fontSize: 11 }}
                                                    onClick={() => handleStatusChange(biz.id, 'REJECTED')}
                                                >
                                                    Arquivar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COLUMN 3: ARQUIVADOS */}
                        <div className="card" style={{ padding: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--text-tertiary)' }} />
                                    <span className="eyebrow" style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Arquivados
                                    </span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {outboundRejectedLeads.length}
                                </span>
                            </div>

                            {outboundRejectedLeads.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 8px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                                    Nenhum lead arquivado.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {outboundRejectedLeads.map((biz) => (
                                        <div
                                            key={biz.id}
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 12,
                                                opacity: 0.7,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)' }}>{biz.name}</div>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ fontSize: 10, padding: '4px 8px' }}
                                                    onClick={() => handleStatusChange(biz.id, 'REVIEWED')}
                                                >
                                                    Reativar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </main>

        {/* Discovery & Sniper Modal */}
        {searchModal && (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSearchModal(false)}>
                <div className="modal" id="search-modal" style={{ maxWidth: 620, padding: 32 }}>

                    {/* Selector Tabs: Sniper vs Garimpo em Lote */}
                    <div style={{ display: 'flex', gap: 8, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: 24, border: '1px solid var(--border-primary)' }}>
                        <button
                            type="button"
                            onClick={() => { setSearchMode('sniper'); setSearchQuery(''); setSearchResult(null); setSniperTarget(null); }}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                fontSize: 13,
                                fontWeight: 700,
                                borderRadius: 'var(--radius-sm)',
                                background: searchMode === 'sniper' ? 'var(--tzolkin-offwhite)' : 'transparent',
                                color: searchMode === 'sniper' ? '#0A0A0A' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <TargetIcon size={16} color={searchMode === 'sniper' ? '#0A0A0A' : 'var(--text-secondary)'} />
                            🎯 MODO SNIPER (Alvo Específico)
                        </button>

                        <button
                            type="button"
                            onClick={() => { setSearchMode('batch'); setSearchQuery(''); setSearchResult(null); setSniperTarget(null); }}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                fontSize: 13,
                                fontWeight: 700,
                                borderRadius: 'var(--radius-sm)',
                                background: searchMode === 'batch' ? 'var(--tzolkin-offwhite)' : 'transparent',
                                color: searchMode === 'batch' ? '#0A0A0A' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <SearchIcon size={16} color={searchMode === 'batch' ? '#0A0A0A' : 'var(--text-secondary)'} />
                            ⛏️ GARIMPO EM LOTE (Nicho)
                        </button>
                    </div>

                    {/* Modal Header Title */}
                    <div style={{ marginBottom: 20 }}>
                        <span className="eyebrow" style={{ marginBottom: 4, fontWeight: 600, color: searchMode === 'sniper' ? '#38BDF8' : 'var(--success)' }}>
                            {searchMode === 'sniper' ? 'RADAR DE INVESTIGAÇÃO CIRÚRGICA DE ALVO' : 'MINERAÇÃO MASSIVA DE TOP O FUNIL'}
                        </span>
                        <h2 className="tzolkin-title" style={{ fontSize: 22, fontWeight: 700 }}>
                            {searchMode === 'sniper' ? 'Sniper de Prospecção' : 'Garimpo em Lote por Nicho'}
                        </h2>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                            {searchMode === 'sniper'
                                ? 'Mire diretamente em uma empresa, CNPJ, Razão Social ou @instagram para extrair sócios, anúncios e gerar o Dossiê.'
                                : 'Encontre de 10 a 50 PMEs com dor digital real (sem site/com anúncios) cruzando Google Places + SEO local.'}
                        </p>
                    </div>

                    <form onSubmit={handleSearch}>
                        {searchMode === 'sniper' ? (
                            /* FORMULÁRIO DO MODO SNIPER */
                            <div>
                                <div style={{ marginBottom: 16 }}>
                                    <label className="auth-label" style={{ display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Empresa Alvo / Nome / CNPJ / Instagram
                                    </label>
                                    <input
                                        className="input"
                                        placeholder="Ex: Studio Dra. Julia, 42.891.203/0001-50, @clinica_estetica_sp..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        style={{ fontSize: 14, padding: '12px 14px' }}
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label className="auth-label" style={{ display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Cidade / Bairro (Opcional para calibrar radar)
                                    </label>
                                    <input
                                        className="input"
                                        placeholder="Ex: São Paulo SP, Vila Olímpia, Curitiba..."
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                    />
                                </div>

                                <div style={{ marginBottom: 20, padding: 14, background: 'rgba(56, 189, 248, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--tzolkin-offwhite)', fontSize: 12, fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={sniperAutoReview}
                                            onChange={(e) => setSniperAutoReview(e.target.checked)}
                                            style={{ accentColor: '#38BDF8', width: 15, height: 15 }}
                                        />
                                        Gerar Dossiê Comercial IA Imediato (Score 1-10 + CNPJ Sócios + Meta Ads)
                                    </label>
                                </div>

                                {/* CARD DE RETORNO DO SNIPER */}
                                {sniperTarget && (
                                    <div style={{ marginBottom: 20, padding: 16, background: 'rgba(10, 10, 10, 0.95)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>🎯 ALVO CAPTURADO COM SUCESSO</span>
                                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tzolkin-offwhite)', marginTop: 2 }}>{sniperTarget.name}</h3>
                                            </div>
                                            <ScoreCircle score={sniperTarget.report?.suitabilityScore} />
                                        </div>

                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            📍 {sniperTarget.address || 'Endereço registrado no Google'} {sniperTarget.phone ? `| 📞 ${sniperTarget.phone}` : ''}
                                        </div>

                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                                            {sniperTarget.hasWebsite ? (
                                                <span className="badge badge-reviewed">🌐 Website Ativo</span>
                                            ) : (
                                                <span className="badge badge-low">🌐 Sem Website</span>
                                            )}
                                            {sniperTarget.cnpj && <span className="badge badge-contacted">💼 CNPJ: {sniperTarget.cnpj}</span>}
                                            {sniperTarget.report?.instagramUrl && <span className="badge badge-reviewed">📸 Instagram Encontrado</span>}
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={() => router.push(`/business/${sniperTarget.id}`)}
                                            >
                                                🚀 Abrir Workspace & Dossiê
                                            </button>
                                            {sniperTarget.phone && (
                                                <a
                                                    href={`https://wa.me/55${sniperTarget.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                                                >
                                                    <WhatsAppIcon size={14} />
                                                    WhatsApp Direct (wa.me)
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* FORMULÁRIO DO MODO GARIMPO EM LOTE */
                            <div>
                                <div style={{ marginBottom: 16 }}>
                                    <label className="auth-label" style={{ display: 'block', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Nicho / Categoria de Negócio
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                        {[
                                            'Clínicas Estéticas',
                                            'Escritórios de Advocacia',
                                            'Academias & Pilates',
                                            'Consultórios Odontológicos',
                                            'Imobiliárias & Construtoras',
                                            'Gastronomia & Restaurantes',
                                            'Estética Automotiva',
                                        ].map((niche) => (
                                            <button
                                                key={niche}
                                                type="button"
                                                onClick={() => setSearchQuery(niche)}
                                                style={{
                                                    fontSize: 11,
                                                    padding: '4px 10px',
                                                    borderRadius: 100,
                                                    background: searchQuery === niche ? 'var(--tzolkin-offwhite)' : 'rgba(255,255,255,0.05)',
                                                    color: searchQuery === niche ? '#0A0A0A' : 'var(--text-secondary)',
                                                    border: searchQuery === niche ? '1px solid var(--tzolkin-offwhite)' : '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer',
                                                    fontWeight: searchQuery === niche ? 600 : 400,
                                                }}
                                            >
                                                {niche}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        className="input"
                                        placeholder="Ex: Escolas de Jiu-Jitsu, Pet Shops, Pizzarias..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label className="auth-label" style={{ display: 'block', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Cidade ou Região Alvo
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                        {['São Paulo SP', 'Rio de Janeiro RJ', 'Belo Horizonte MG', 'Curitiba PR', 'Porto Alegre RS', 'Campinas SP'].map((city) => (
                                            <button
                                                key={city}
                                                type="button"
                                                onClick={() => setSearchLocation(city)}
                                                style={{
                                                    fontSize: 10,
                                                    padding: '3px 8px',
                                                    borderRadius: 4,
                                                    background: searchLocation === city ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                                                    color: searchLocation === city ? 'var(--success)' : 'var(--text-tertiary)',
                                                    border: searchLocation === city ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                📍 {city}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        className="input"
                                        placeholder="Ex: São Paulo SP, Moema SP, Salvador BA..."
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                    />
                                </div>

                                <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--tzolkin-offwhite)', fontSize: 12, fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={onlyWithoutWebsite}
                                            onChange={(e) => setOnlyWithoutWebsite(e.target.checked)}
                                            style={{ accentColor: '#10B981', width: 15, height: 15 }}
                                        />
                                        Priorizar negócios sem website (Dor de Web Design)
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                                        Lote:
                                        <select
                                            className="input"
                                            value={maxResults}
                                            onChange={(e) => setMaxResults(Number(e.target.value))}
                                            style={{ padding: '4px 8px', fontSize: 12, minWidth: 60 }}
                                        >
                                            <option value={10}>10 Leads</option>
                                            <option value={20}>20 Leads</option>
                                            <option value={50}>50 Leads</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Resultado da Busca em Lote */}
                        {searchResult && !sniperTarget && (
                            <div style={{ marginBottom: 20, padding: 14, background: searchResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)', border: searchResult.error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
                                {searchResult.error ? (
                                    <div style={{ fontSize: 12, color: 'var(--error)' }}>⚠️ {searchResult.error}</div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>
                                            ✨ {searchResult.savedCount} novos leads garimpados com sucesso!
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            Total no Google Maps: {searchResult.totalFound} | Sem website: {searchResult.withoutWebsite}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setSearchModal(false); setSearchResult(null); setSniperTarget(null); }}
                            >
                                {searchResult || sniperTarget ? 'Fechar' : 'Cancelar'}
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={searching || !searchQuery.trim()}
                                style={{
                                    background: searchMode === 'sniper' ? 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' : undefined,
                                    border: 'none',
                                }}
                            >
                                {searching
                                    ? (searchMode === 'sniper' ? '🎯 Mirando & Processando Alvo...' : 'Garimpando Lote...')
                                    : (searchMode === 'sniper' ? '🎯 Disparar Radar Sniper ↗' : 'Iniciar Garimpo em Lote ↗')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Toast Component */}
        {toast && (
            <div className="toast">
                {toast.isError ? <CrossIcon size={14} color="var(--error)" /> : <CheckIcon size={14} color="var(--success)" />}
                {toast.message}
            </div>
        )}
    </div>
);
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<TzolkinLoader />}>
            <DashboardContent />
        </Suspense>
    );
}
