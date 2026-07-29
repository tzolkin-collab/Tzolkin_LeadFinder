'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/legacy/Header.js';
import { TzolkinLoader } from '../../../components/brand/TzolkinLogo.js';
import { SocialMediaEmbeds } from '../../../components/legacy/SocialMediaEmbeds.js';
import { GooglePlacesIcon, GoogleAdsIcon, InstagramIcon, MetaAdsIcon, OpenAiIcon, WhatsAppIcon, TikTokIcon } from '../../../components/brand/ServiceLogos.js';
import { PhotosIcon, ActionsIcon, TargetIcon, WarningIcon, WrenchIcon, GlobeIcon, FolderIcon, CalendarIcon, LinkIcon, PaletteIcon, CheckIcon, CrossIcon, PinIcon, ClipboardIcon, SparklesIcon, IdeaIcon } from '../../../components/brand/UIIcons.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

function isRealWebsiteUrl(url) {
    if (!url) return false;
    try {
        const cleanUrl = url.trim().toLowerCase();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) return false;
        const hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
        
        const socialDomains = [
            'instagram.com', 'instagr.am',
            'facebook.com', 'fb.com', 'fb.me',
            'wa.me', 'whatsapp.com', 'api.whatsapp.com',
            'tiktok.com',
            'youtube.com', 'youtu.be',
            'twitter.com', 'x.com',
            'linkedin.com',
            'linktr.ee', 'beacons.ai', 'bio.link', 'taplink.cc'
        ];
        
        return !socialDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

function getDomainFromUrl(url) {
    if (!url) return '';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function getFaviconUrl(url) {
    const domain = getDomainFromUrl(url);
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function MetricPill({ icon, label, value, color = 'var(--text-primary)', bg = 'rgba(255, 255, 255, 0.03)' }) {
    if (!value) return null;
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            background: bg,
            border: '1px solid var(--border-primary)',
            fontSize: 12,
            fontWeight: 500,
            color,
        }}>
            {icon}
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{label}:</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{value}</span>
        </div>
    );
}

function ScoreGauge({ score }) {
    if (score == null) return null;
    const color = score >= 7 ? 'var(--success)' : score >= 4 ? 'var(--warning)' : 'var(--error)';
    const percentage = score * 10;

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: 20,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifySpace: 'space-between',
            gap: 20,
            marginBottom: 20
        }}>
            <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 4 }}>
                    SCORE DE ADERÊNCIA ICP
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-sans)', color }}>
                    {score}<span style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>/10</span>
                </div>
            </div>
            <div style={{ flex: 1, maxWidth: 260 }}>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 100, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                    <span>BAIXO</span>
                    <span>MÉDIO</span>
                    <span>ELEVADO</span>
                </div>
            </div>
        </div>
    );
}

export default function BusinessDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(false);
    const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'evidence' | 'signals'
    const [toast, setToast] = useState(null);
    const [scrapedCodeContent, setScrapedCodeContent] = useState(null);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [websiteViewMode, setWebsiteViewMode] = useState('screenshot'); // 'screenshot' | 'iframe'

    const showToast = (msg, isError = false) => {
        setToast({ message: msg, isError });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (!getToken()) {
            router.push('/');
            return;
        }
        fetchBusiness();
    }, [id]);

    async function fetchBusiness() {
        try {
            const res = await fetch(`${API_URL}/api/businesses/${id}`, { headers: authHeaders() });
            if (res.status === 401) { router.push('/'); return; }
            if (res.status === 404) { router.push('/feed'); return; }
            const data = await res.json();
            setBusiness(data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleReview() {
        setReviewing(true);
        showToast('Processando auditoria comercial...');
        try {
            const res = await fetch(`${API_URL}/api/search/review/${id}`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const data = await res.json();
            setBusiness(data.business);
            showToast('Dossiê atualizado com sucesso!');
        } catch (err) {
            showToast('Erro na análise', true);
        } finally {
            setReviewing(false);
        }
    }

    async function handleStatusChange(status) {
        try {
            await fetch(`${API_URL}/api/businesses/${id}/status`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ status }),
            });
            fetchBusiness();
            showToast(`Status alterado para ${status}`);
        } catch (err) {
            showToast('Erro ao atualizar status', true);
        }
    }

    async function handleDelete() {
        if (!confirm('Remover este negócio permanentemente?')) return;
        try {
            await fetch(`${API_URL}/api/businesses/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            router.push('/feed');
        } catch (err) {
            showToast('Erro ao remover', true);
        }
    }

    async function loadScrapedCode(url) {
        if (!url) return null;
        try {
            const res = await fetch(`${API_URL}${url}`);
            const text = await res.text();
            setScrapedCodeContent(text);
            return text;
        } catch {
            showToast('Erro ao carregar código HTML/CSS', true);
            return null;
        }
    }

    async function handleOpenCodeModal(url) {
        if (!scrapedCodeContent && url) {
            await loadScrapedCode(url);
        }
        setShowCodeModal(true);
    }

    useEffect(() => {
        const scrapedCodeUrl = business?.report?.scrapedCodeUrl;
        if (websiteViewMode === 'renderedHtml' && scrapedCodeUrl && !scrapedCodeContent) {
            loadScrapedCode(scrapedCodeUrl);
        }
    }, [websiteViewMode, business?.report?.scrapedCodeUrl, scrapedCodeContent]);

    if (loading) {
        return (
            <div className="page">
                <TzolkinLoader />
            </div>
        );
    }

    if (!business) return null;

    const report = business.report;
    const analysis = report?.aiAnalysis;
    const metaAds = report?.aiAnalysis?.enrichment ?? { hasAds: false, adsCount: 0 };

    const rawPhone = business.phone ? business.phone.replace(/\D/g, '') : '';
    const formattedPhone = rawPhone.length >= 10 && !rawPhone.startsWith('55') ? `55${rawPhone}` : rawPhone;
    const whatsappLink = formattedPhone && report?.approachSuggestion
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(report.approachSuggestion)}`
        : null;

    return (
        <div className="page">
            <Header />

            <main className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
                
                {/* Back Link */}
                <div style={{ marginBottom: 16 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/feed')}>
                        ← Voltar ao Pipeline
                    </button>
                </div>

                {/* Header Dossier Panel */}
                <div className="card" style={{ marginBottom: 20, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span className="eyebrow" style={{ fontSize: 10 }}>DOSSIÊ COMERCIAL</span>
                                {report && (
                                    <span className={`badge ${report.status === 'PENDING' ? 'badge-pending' :
                                            report.status === 'REVIEWED' ? 'badge-reviewed' :
                                                report.status === 'CONTACTED' ? 'badge-contacted' : 'badge-rejected'
                                        }`}>
                                        {report.status}
                                    </span>
                                )}
                            </div>
                            
                            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
                                {business.name}
                            </h1>
                            
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                                <PinIcon size={14} color="var(--text-tertiary)" />
                                {business.address}
                            </p>

                            {/* Metrics Row */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {business.rating && (
                                    <MetricPill
                                        icon={<GooglePlacesIcon size={14} />}
                                        label="Google"
                                        value={`${business.rating} ★ (${business.reviewCount || 0})`}
                                    />
                                )}
                                {report?.instagramFollowers && (
                                    <MetricPill
                                        icon={<InstagramIcon size={14} />}
                                        label="Instagram"
                                        value={`${report.instagramFollowers} seg.`}
                                    />
                                )}
                                <MetricPill
                                    icon={<MetaAdsIcon size={14} />}
                                    label="Meta Ads"
                                    value={metaAds.hasAds ? `${metaAds.adsCount || 1} Ativo(s)` : 'Sem Anúncios'}
                                    color={metaAds.hasAds ? 'var(--success)' : 'var(--text-tertiary)'}
                                />
                                <MetricPill
                                    icon={<GoogleAdsIcon size={14} />}
                                    label="Google Ads"
                                    value="Central de Transparência ↗"
                                    color="var(--text-primary)"
                                />
                                <MetricPill
                                    icon={<TikTokIcon size={14} />}
                                    label="TikTok Ads"
                                    value="Biblioteca TikTok ↗"
                                    color="var(--text-primary)"
                                />
                                <MetricPill
                                    icon={<GlobeIcon size={14} />}
                                    label="Website"
                                    value={business.hasWebsite ? 'Ativo' : 'Sem Website'}
                                    color={business.hasWebsite ? 'var(--text-primary)' : 'var(--warning)'}
                                />
                            </div>
                        </div>

                        {/* Action Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleReview}
                                    disabled={reviewing}
                                >
                                    {reviewing ? 'Analisando...' : (report ? 'Refazer Auditoria ↻' : 'Gerar Auditoria')}
                                </button>

                                {whatsappLink && (
                                    <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                    >
                                        <WhatsAppIcon size={14} />
                                        WhatsApp Web ↗
                                    </a>
                                )}

                                <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                                    Excluir
                                </button>
                            </div>

                            {/* Status Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>Status:</span>
                                {['PENDING', 'REVIEWED', 'CONTACTED', 'REJECTED'].map(s => (
                                    <button
                                        key={s}
                                        className={`btn btn-sm ${report?.status === s ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => handleStatusChange(s)}
                                        style={{ fontSize: 10, padding: '2px 8px' }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 20,
                    borderBottom: '1px solid var(--border-primary)',
                    paddingBottom: 8
                }}>
                    <button
                        className={`btn btn-sm ${activeTab === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('ai')}
                    >
                        Estratégia & Pitch Comercial
                    </button>

                    <button
                        className={`btn btn-sm ${activeTab === 'evidence' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('evidence')}
                    >
                        Evidências Visuais & Scrapes
                    </button>

                    <button
                        className={`btn btn-sm ${activeTab === 'signals' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('signals')}
                    >
                        Sinais Digitais & Ads
                    </button>
                </div>

                {/* TAB 1: ESTRATÉGIA & PITCH */}
                {activeTab === 'ai' && (
                    <div>
                        {report?.aiAnalysis ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                                
                                <div>
                                    <ScoreGauge score={report.suitabilityScore} />

                                    {/* Decision Maker Profiling */}
                                    <div className="card" style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                            PERFIL DO DECISOR ALVO
                                        </div>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                                            {business.category?.toLowerCase().includes('restaurante') || business.category?.toLowerCase().includes('steak') 
                                                ? 'Sócio-Proprietário / Gerente de Operações' 
                                                : 'Fundador / Diretor Comercial'}
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            Decisor com foco em retorno direto sobre investimento (ROI), autoridade de marca frente aos concorrentes locais e otimização de conversão.
                                        </p>
                                    </div>

                                    {/* WhatsApp Pitch Bubble */}
                                    {report.approachSuggestion && (
                                        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--tzolkin-yellow)' }}>
                                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--tzolkin-yellow)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <WhatsAppIcon size={14} />
                                                MINUTA DE ABORDAGEM (WHATSAPP)
                                            </div>

                                            <div style={{
                                                background: 'var(--bg-input)',
                                                padding: 16,
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-primary)',
                                                fontSize: 13,
                                                lineHeight: 1.7,
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'pre-line',
                                                marginBottom: 12,
                                                fontFamily: 'var(--font-sans)',
                                            }}>
                                                {report.approachSuggestion}
                                            </div>

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(report.approachSuggestion);
                                                        showToast('Script copiado!');
                                                    }}
                                                >
                                                    Copiar Script
                                                </button>

                                                {whatsappLink && (
                                                    <a
                                                        href={whatsappLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Enviar no WhatsApp ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* DECISORES MAPEADOS (LINKEDIN & OUTBOUND) */}
                                    <div className="card" style={{ marginBottom: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--tzolkin-offwhite)', fontWeight: 700 }}>
                                                DECISORES MAPEADOS (LINKEDIN & SERPER)
                                            </div>
                                            <span style={{ fontSize: 10, background: 'var(--success-soft)', color: 'var(--success)', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                                                AUTOMÁTICO
                                            </span>
                                        </div>

                                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                                            Decisores identificados na empresa com cargo e contato para abordagem direta:
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                                            <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>
                                                        {business.decisionMakerName || 'Sócio / Proprietário'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                        {business.decisionMakerRole || 'CEO & Fundador'}
                                                    </div>
                                                </div>
                                                <a
                                                    href={business.decisionMakerLinkedin || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(business.name)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ fontSize: 11 }}
                                                >
                                                    LinkedIn ↗
                                                </a>
                                            </div>
                                        </div>

                                        {/* SELETOR DE ESTRATÉGIA OUTBOUND */}
                                        <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                                            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                                ESTRATÉGIA DE ABORDAGEM CUSTOMIZADA
                                            </label>
                                            <select
                                                className="form-control"
                                                style={{ width: '100%', fontSize: 12, background: 'var(--bg-main)', color: 'var(--tzolkin-offwhite)', border: '1px solid var(--border-primary)', padding: '6px 10px', borderRadius: 'var(--radius-xs)', marginBottom: 10 }}
                                                onChange={(e) => {
                                                    showToast(`Estratégia selecionada: ${e.target.value}`);
                                                }}
                                            >
                                                <option value="pitch_roi">Pitch 1: Foco em Aumento de ROI & Vendas (Recomendado)</option>
                                                <option value="pitch_brand">Pitch 2: Foco em Reestruturação de Marca & Posicionamento</option>
                                                <option value="pitch_audit">Pitch 3: Enviar Auditoria Gratuita do Site/Insta</option>
                                                <option value="pitch_quick">Pitch 4: Convite Direto para Reunião de 15 Minutos</option>
                                            </select>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
                                                onClick={() => showToast('Abordagem vinculada ao Kanban de Outbound!')}
                                            >
                                                Ativar Sequência de Cadência Outbound 🚀
                                            </button>
                                        </div>
                                    </div>

                                    {/* Executive Diagnosis */}
                                    <div className="card" style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                                            DIAGNÓSTICO COMERCIAL
                                        </div>
                                        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                            {report.aiSummary}
                                        </p>
                                    </div>

                                    {/* Strengths */}
                                    {analysis?.strengths?.length > 0 && (
                                        <div className="card" style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--success)', marginBottom: 10 }}>
                                                PONTOS FORTES PARA ABORDAGEM
                                            </div>
                                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {analysis.strengths.map((item, i) => (
                                                    <li key={i} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--text-primary)' }}>
                                                        • {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Challenges */}
                                    {analysis?.challenges?.length > 0 && (
                                        <div className="card">
                                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--warning)', marginBottom: 10 }}>
                                                OBJEÇÕES PREVISTAS
                                            </div>
                                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {analysis.challenges.map((item, i) => (
                                                    <li key={i} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                        • {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                                <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                                    Nenhuma auditoria comercial foi gerada para este lead ainda.
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={handleReview} disabled={reviewing}>
                                    {reviewing ? 'Analisando...' : 'Gerar Auditoria Comercial'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: EVIDÊNCIAS & SCRAPES & SOCIAL EMBEDS */}
                {activeTab === 'evidence' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <SocialMediaEmbeds
                            instagramUrl={report?.instagramUrl}
                            instagramBio={report?.instagramBio}
                            instagramFollowers={report?.instagramFollowers}
                            instagramPosts={report?.instagramPosts}
                            tiktokUrl={report?.aiAnalysis?.enrichment?.tiktokUrl}
                            linkedinUrl={report?.aiAnalysis?.enrichment?.linkedinUrl}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                            {/* WEBSITE EMBED & SCREENSHOT */}
                            <div className="card">
                                {(() => {
                                    const isRealSite = isRealWebsiteUrl(business.websiteUrl);
                                    const hasSocialLinkOnly = business.websiteUrl && !isRealSite;
                                    const favicon = getFaviconUrl(business.websiteUrl);
                                    const domain = getDomainFromUrl(business.websiteUrl);

                                    return (
                                        <>
                                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>WEBSITE OFICIAL (EVIDÊNCIA VISUAL HD)</span>
                                                {isRealSite ? (
                                                    <span className="badge badge-reviewed">🌐 Website Detectado</span>
                                                ) : hasSocialLinkOnly ? (
                                                    <span className="badge badge-rejected">⚠️ Apenas Rede Social</span>
                                                ) : (
                                                    <span className="badge badge-rejected">⚠️ Sem Website</span>
                                                )}
                                            </div>

                                            {isRealSite ? (
                                                <div>
                                                    {/* Domain & Favicon Header Bar */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', marginBottom: 12 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {favicon && <img src={favicon} alt="Favicon" style={{ width: 18, height: 18, borderRadius: 3 }} onError={(e) => e.target.style.display = 'none'} />}
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tzolkin-offwhite)', fontFamily: 'var(--font-sans)' }}>{domain}</span>
                                                        </div>
                                                        <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--tzolkin-cyan)', textDecoration: 'none' }}>
                                                            Abrir Site ↗
                                                        </a>
                                                    </div>

                                                    {/* Selector Bar */}
                                                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
                                                        <button
                                                            className={`btn btn-sm ${websiteViewMode === 'screenshot' ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => setWebsiteViewMode('screenshot')}
                                                            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                                                        >
                                                            📸 Captura HD (Puppeteer)
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${websiteViewMode === 'iframe' ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => setWebsiteViewMode('iframe')}
                                                            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                                                        >
                                                            🌐 Iframe ao Vivo
                                                        </button>
                                                        {report?.scrapedCodeUrl && (
                                                            <button
                                                                className={`btn btn-sm ${websiteViewMode === 'renderedHtml' ? 'btn-primary' : 'btn-secondary'}`}
                                                                onClick={() => setWebsiteViewMode('renderedHtml')}
                                                                style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                                                            >
                                                                📄 HTML Renderizado
                                                            </button>
                                                        )}
                                                    </div>

                                                    {websiteViewMode === 'screenshot' ? (
                                                        <div>
                                                            {report?.websiteScreenshotUrl ? (
                                                                <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)', background: '#fff', marginBottom: 14 }}>
                                                                    <a href={`${API_URL}${report.websiteScreenshotUrl}`} target="_blank" rel="noopener noreferrer" title="Clique para expandir a captura">
                                                                        <img
                                                                            src={`${API_URL}${report.websiteScreenshotUrl}`}
                                                                            alt="Website Screenshot HD"
                                                                            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                                                                        />
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 12, marginBottom: 14 }}>
                                                                    Captura HD em processamento... O robô está gerando o print do site.
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : websiteViewMode === 'renderedHtml' ? (
                                                        <div>
                                                            <div style={{ width: '100%', height: 380, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)', marginBottom: 8, background: '#fff' }}>
                                                                {scrapedCodeContent ? (
                                                                    <iframe
                                                                        srcDoc={scrapedCodeContent}
                                                                        title="Website Scraped HTML Rendered"
                                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                                        sandbox="allow-scripts allow-same-origin allow-forms"
                                                                    />
                                                                ) : (
                                                                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        Carregando visualização HTML/CSS extraída pelo robô...
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 14, fontStyle: 'italic' }}>
                                                                💡 Renderizando a cópia do HTML extraído diretamente pelo robô. Bula bloqueios de iFrame/Cloudflare do site de origem.
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ width: '100%', height: 380, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)', marginBottom: 8, background: '#fff' }}>
                                                                <iframe
                                                                    src={business.websiteUrl}
                                                                    title="Website Live View"
                                                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                                                />
                                                            </div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 14, fontStyle: 'italic' }}>
                                                                ⚠️ Nota: Alguns servidores web (Cloudflare, X-Frame-Options) bloqueiam embeds externos no navegador. Alterne para &quot;Captura HD&quot; ou &quot;HTML Renderizado&quot; para visualização garantida.
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', gap: 10 }}>
                                                        <a
                                                            href={business.websiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ flex: 1, justifyContent: 'center' }}
                                                        >
                                                            Abrir Website em Nova Aba ↗
                                                        </a>
                                                        {report?.scrapedCodeUrl && (
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => handleOpenCodeModal(report.scrapedCodeUrl)}
                                                                style={{ justifyContent: 'center' }}
                                                            >
                                                                Código Fonte (HTML)
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : hasSocialLinkOnly ? (
                                                <div style={{ padding: 20, background: 'rgba(234, 179, 8, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>
                                                        ⚡ DOR DIGITAL CONFIRMADA: APENAS PERFIL SOCIAL DETECTADO
                                                    </div>
                                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                                                        O estabelecimento não possui um <strong>website próprio</strong> em domínio oficial. O link cadastrado redireciona para uma rede social ou agregador.
                                                    </p>

                                                    {/* Rich Social Card */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', marginBottom: 14 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {favicon && <img src={favicon} alt="Social Favicon" style={{ width: 22, height: 22, borderRadius: 4 }} onError={(e) => e.target.style.display = 'none'} />}
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>{domain}</div>
                                                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{business.websiteUrl}</div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={business.websiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ fontSize: 11 }}
                                                        >
                                                            Abrir Perfil ↗
                                                        </a>
                                                    </div>

                                                    <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                                                        🎯 Oportunidade de Ouro: Oferta de Landing Page de Alta Conversão em Domínio Próprio
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: 24, textAlign: 'center', background: 'rgba(234, 179, 8, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>
                                                        ⚡ DOR DIGITAL CONFIRMADA: ESTABELECIMENTO SEM WEBSITE
                                                    </div>
                                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                                                        Este negócio não possui website oficial cadastrado no Google Maps nem no perfil de redes sociais.
                                                    </p>
                                                    <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                                                        🎯 Oportunidade de Ouro: Oferta de Landing Page de Alta Conversão
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* INSTAGRAM AUDIT, EMBED & SCREENSHOT */}
                            <div className="card">
                                <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>PERFIL INSTAGRAM (EMBED AO VIVO & ANÁLISE)</span>
                                    {report?.instagramUrl && <span className="badge badge-reviewed">📸 Instagram Ativo</span>}
                                </div>

                                {report?.instagramUrl ? (
                                    <div>
                                        {/* Instagram Live Embed Frame */}
                                        <div style={{ width: '100%', height: 420, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)', marginBottom: 14, background: '#000' }}>
                                            <iframe
                                                src={`https://www.instagram.com/${report.instagramUrl.trim().replace(/\/$/, '').split('/').pop().replace('@', '')}/embed`}
                                                title="Instagram Embed"
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                                frameBorder="0"
                                                scrolling="no"
                                                allowtransparency="true"
                                            />
                                        </div>

                                        {/* Custom Instagram Inspector Card */}
                                        <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', marginBottom: 14 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 100, background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F56040)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <InstagramIcon size={22} color="#fff" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>
                                                        @{report.instagramUrl.trim().replace(/\/$/, '').split('/').pop().replace('@', '')}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--success)' }}>
                                                        Perfil Rastreado & Enriquecido
                                                    </div>
                                                </div>
                                            </div>

                                            {report.instagramBio && (
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' }}>
                                                    &ldquo;{report.instagramBio}&rdquo;
                                                </p>
                                            )}

                                            <a
                                                href={report.instagramUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary btn-sm"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                            >
                                                Abrir Perfil Oficial no Instagram ↗
                                            </a>
                                        </div>

                                        {report?.instagramScreenshotUrl && (
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>CAPTURA ESTÁTICA DO PERFIL (PUPPETEER):</div>
                                                <a href={`${API_URL}${report.instagramScreenshotUrl}`} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={`${API_URL}${report.instagramScreenshotUrl}`}
                                                        alt="Instagram Screenshot"
                                                        style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                                        Nenhum perfil de Instagram rastreado para este negócio.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: SINAIS DIGITAIS & ADS */}
                {activeTab === 'signals' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                        <div className="card">
                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                                GOOGLE PLACES SPECS
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-tertiary)' }}>Telefone:</span><span>{business.phone || 'N/A'}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-tertiary)' }}>Categoria:</span><span>{business.category || 'N/A'}</span></div>
                                {business.googleMapsUrl && (
                                    <a href={business.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                                        Google Maps ↗
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MetaAdsIcon size={16} />
                                META ADS LIBRARY
                            </div>
                            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', marginBottom: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: metaAds.hasAds ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                    {metaAds.hasAds ? `Anúncios Ativos (${metaAds.adsCount || 1})` : 'Sem Anúncios Detectados'}
                                </div>
                            </div>
                            {report?.aiAnalysis?.enrichment?.adsLibraryUrl && (
                                <a href={report.aiAnalysis.enrichment.adsLibraryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                    Meta Ads Library ↗
                                </a>
                            )}
                        </div>

                        <div className="card">
                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <GoogleAdsIcon size={16} />
                                GOOGLE ADS TRANSPARENCY
                            </div>
                            <a
                                href={`https://adstransparency.google.com/?region=BR&q=${encodeURIComponent(business.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                            >
                                Google Ads Transparency ↗
                            </a>
                        </div>

                        <div className="card">
                            <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', textTransform: 'none', color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TikTokIcon size={16} />
                                TIKTOK ADS LIBRARY
                            </div>
                            <a
                                href={`https://library.tiktok.com/ads?region=BR&q=${encodeURIComponent(business.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                            >
                                TikTok Ads Library ↗
                            </a>
                        </div>
                    </div>
                )}
            </main>

            {/* Code Modal */}
            {showCodeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 760, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>Código extraído (HTML/CSS)</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowCodeModal(false)}>✕</button>
                        </div>
                        <pre style={{
                            flex: 1,
                            overflow: 'auto',
                            background: '#09090b',
                            padding: 14,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 11,
                            fontFamily: 'var(--font-sans)',
                            color: '#10b981',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {scrapedCodeContent}
                        </pre>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="toast">
                    {toast.message}
                </div>
            )}
        </div>
    );
}
