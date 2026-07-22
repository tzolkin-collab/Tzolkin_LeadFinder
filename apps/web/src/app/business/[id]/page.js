'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { TzolkinLockup, TzolkinLoader } from '../../../components/brand/TzolkinLogo.js';
import { GooglePlacesIcon, InstagramIcon, MetaAdsIcon, OpenAiIcon, WhatsAppIcon } from '../../../components/brand/ServiceLogos.js';
import { PhotosIcon, ActionsIcon, TargetIcon, IdeaIcon, WarningIcon, WrenchIcon, GlobeIcon, FolderIcon, CalendarIcon, LinkIcon, PaletteIcon } from '../../../components/brand/UIIcons.js';

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

function ScoreBar({ score }) {
    if (score == null) return null;
    const color = score >= 7 ? 'var(--score-high)' : score >= 4 ? 'var(--score-medium)' : 'var(--score-low)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color, minWidth: 40 }}>{score}/10</span>
        </div>
    );
}

function InfoRow({ label, value, link }) {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
            {link ? (
                <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>
                    {typeof link === 'string' ? link : 'Abrir ↗'}
                </a>
            ) : (
                <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            )}
        </div>
    );
}

function Section({ title, children, icon }) {
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
                {title}
            </h3>
            {children}
        </div>
    );
}

export default function BusinessDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
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
            if (res.status === 404) { router.push('/dashboard'); return; }
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
        showToast('Analisando com IA e buscando Instagram...');
        try {
            const res = await fetch(`${API_URL}/api/search/review/${id}`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const data = await res.json();
            setBusiness(data.business);
            showToast('✓ Análise concluída!');
        } catch (err) {
            showToast('✗ Erro na análise');
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
            showToast(`Status atualizado para ${status}`);
        } catch (err) {
            showToast('Erro ao atualizar status');
        }
    }

    async function handleDelete() {
        if (!confirm('Remover este negócio permanentemente?')) return;
        try {
            await fetch(`${API_URL}/api/businesses/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            router.push('/dashboard');
        } catch (err) {
            showToast('Erro ao remover');
        }
    }

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
                        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} id="back-btn">
                            ← Dashboard
                        </button>
                        <TzolkinLockup size={28} theme="dark" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {!report && (
                            <button
                                className="btn btn-primary"
                                onClick={handleReview}
                                disabled={reviewing}
                                id="review-btn"
                            >
                                {reviewing ? <><span className="spinner" /> Analisando...</> : '🤖 Analisar com IA'}
                            </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={handleDelete} id="delete-btn">Remover</button>
                    </div>
                </div>
            </header>

            <main className="container" style={{ paddingTop: 32, paddingBottom: 64, position: 'relative', zIndex: 1 }}>
                {/* Title area */}
                <div className="fade-in" style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{business.name}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{business.address}</p>
                    {report && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className={`badge ${report.status === 'PENDING' ? 'badge-pending' :
                                    report.status === 'REVIEWED' ? 'badge-reviewed' :
                                        report.status === 'CONTACTED' ? 'badge-contacted' : 'badge-rejected'
                                }`}>
                                {report.status === 'PENDING' ? 'Pendente' :
                                    report.status === 'REVIEWED' ? 'Analisado' :
                                        report.status === 'CONTACTED' ? 'Contatado' : 'Rejeitado'}
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                    {/* Left Column */}
                    <div>
                        {/* Google Data */}
                        <Section title="Dados do Google Places" icon={<GooglePlacesIcon size={20} />}>
                            <InfoRow label="Telefone" value={business.phone} />
                            <InfoRow label="Categoria" value={business.category} />
                            <InfoRow label="Avaliação" value={business.rating ? `${business.rating} ★ (${business.reviewCount || 0} avaliações)` : null} />
                            <InfoRow label="Horário" value={business.openingHours} />
                            <InfoRow label="Coordenadas" value={business.latitude && business.longitude ? `${business.latitude}, ${business.longitude}` : null} />
                            <InfoRow label="Como Chegar" value={business.latitude && business.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}` : null} link="Ver Rota ↗" />
                            <InfoRow label="Google Maps" value={business.googleMapsUrl} link="Abrir no Maps ↗" />
                            <InfoRow label="Website" value={business.hasWebsite ? business.websiteUrl : 'Sem website'} link={business.hasWebsite ? 'Visitar ↗' : undefined} />
                        </Section>

                        {/* Google Photos */}
                        {business.photos?.length > 0 && (
                            <Section title="Galeria de Fotos" icon={<PhotosIcon size={20} />}>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                    gap: 12,
                                    marginTop: 8 
                                }}>
                                    {business.photos.map((url, i) => (
                                        <a href={url} target="_blank" rel="noopener noreferrer" key={i}>
                                            <img 
                                                src={url} 
                                                alt={`Photo ${i}`} 
                                                style={{ 
                                                    width: '100%', 
                                                    aspectRatio: '1/1', 
                                                    objectFit: 'cover', 
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border-primary)',
                                                    cursor: 'pointer'
                                                }} 
                                            />
                                        </a>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Instagram */}
                        {report?.instagramUrl && (
                            <Section title="Instagram Profiling" icon={<InstagramIcon size={20} />}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                    {report.profilePicUrl && (
                                        <img
                                            src={report.profilePicUrl}
                                            alt="Profile"
                                            style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border-primary)', objectFit: 'cover' }}
                                        />
                                    )}
                                    <div>
                                        <a href={report.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                                            {report.instagramUrl.replace('https://www.instagram.com/', '@').replace('/', '')}
                                        </a>
                                        {report.instagramFollowers && (
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                {report.instagramFollowers} seguidores · {report.instagramPosts || '?'} posts
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {report.instagramBio && (
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                        &ldquo;{report.instagramBio}&rdquo;
                                    </p>
                                )}

                                {/* Deep Enrichment Data */}
                                {report.aiAnalysis?.enrichment && (
                                    <div style={{ marginTop: 24 }}>
                                        <div style={{ 
                                            marginBottom: 16, 
                                            padding: '16px', 
                                            background: 'var(--bg-card)', 
                                            borderRadius: 'var(--radius-md)', 
                                            border: '1px solid var(--border-primary)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <MetaAdsIcon size={20} />
                                                    <span style={{ fontSize: 14, fontWeight: 600 }}>Meta Ads Status</span>
                                                </div>
                                                <span style={{ 
                                                    fontSize: 11, 
                                                    fontWeight: 700, 
                                                    padding: '4px 12px', 
                                                    borderRadius: 100,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    background: report.aiAnalysis.enrichment.hasAds ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                    color: report.aiAnalysis.enrichment.hasAds ? '#22c55e' : '#6b7280',
                                                    border: report.aiAnalysis.enrichment.hasAds ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(107, 114, 128, 0.2)'
                                                }}>
                                                    {report.aiAnalysis.enrichment.hasAds ? `${report.aiAnalysis.enrichment.adsCount} Anúncios Ativos` : 'Sem Anúncios'}
                                                </span>
                                            </div>
                                        </div>

                                        {report.aiAnalysis.enrichment.externalLinks?.length > 0 && (
                                            <div style={{ marginTop: 20 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: 4 }}>
                                                    Links do Linktree / Social
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                                    {report.aiAnalysis.enrichment.externalLinks.map((link, i) => (
                                                        <a 
                                                            key={i} 
                                                            href={link.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="linktree-item"
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: 12, 
                                                                padding: '12px 16px', 
                                                                background: 'var(--bg-card)', 
                                                                borderRadius: 'var(--radius-md)',
                                                                textDecoration: 'none',
                                                                color: 'var(--text-primary)',
                                                                fontSize: 14,
                                                                border: '1px solid var(--border-primary)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {link.type === 'whatsapp' ? <WhatsAppIcon size={18} /> : 
                                                                link.type === 'website' ? <GlobeIcon size={18} /> : 
                                                                link.type === 'portfolio' ? <FolderIcon size={18} /> : 
                                                                link.type === 'calendar' ? <CalendarIcon size={18} /> : <LinkIcon size={18} />}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 500 }}>{link.text}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                                                    {link.url.replace(/^https?:\/\//, '')}
                                                                </div>
                                                            </div>
                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>↗</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Status actions */}
                        <Section title="Ações do Lead" icon={<ActionsIcon size={20} />}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['PENDING', 'REVIEWED', 'CONTACTED', 'REJECTED'].map(s => (
                                    <button
                                        key={s}
                                        className={`btn btn-sm ${report?.status === s ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => handleStatusChange(s)}
                                    >
                                        {s === 'PENDING' ? 'Pendente' : s === 'REVIEWED' ? 'Analisado' : s === 'CONTACTED' ? 'Contatado' : 'Rejeitado'}
                                    </button>
                                ))}
                            </div>
                            {report && !report.aiAnalysis && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleReview}
                                    disabled={reviewing}
                                    style={{ marginTop: 16, width: '100%' }}
                                >
                                    {reviewing ? <><span className="spinner" /> Analisando...</> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><OpenAiIcon size={16} /> Analisar com IA</span>}
                                </button>
                            )}
                        </Section>
                    </div>

                    {/* Right Column — AI Report */}
                    <div>
                        {report?.aiAnalysis ? (
                            <>
                                {/* Score */}
                                <Section title="Score de Adequação" icon={<TargetIcon size={20} />}>
                                    <ScoreBar score={report.suitabilityScore} />
                                    {analysis?.priority && (
                                        <div style={{ marginTop: 12, fontSize: 13 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Prioridade: </span>
                                            <span style={{
                                                fontWeight: 600,
                                                color: analysis.priority === 'alta' ? 'var(--success)' :
                                                    analysis.priority === 'média' ? 'var(--warning)' : 'var(--text-tertiary)',
                                            }}>
                                                {analysis.priority.charAt(0).toUpperCase() + analysis.priority.slice(1)}
                                            </span>
                                        </div>
                                    )}
                                </Section>

                                {/* Summary */}
                                <Section title="Dossiê OpenAI GPT-4o-mini" icon={<OpenAiIcon size={20} />}>
                                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                        {report.aiSummary}
                                    </p>
                                </Section>

                                {/* Approach */}
                                {report.approachSuggestion && (
                                    <Section title="Sugestão de Abordagem" icon="💡">
                                        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                            {report.approachSuggestion}
                                        </p>
                                    </Section>
                                )}

                                {/* Strengths & Challenges */}
                                {(analysis?.strengths?.length > 0 || analysis?.challenges?.length > 0) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {analysis.strengths?.length > 0 && (
                                            <Section title="Pontos Fortes" icon="✅">
                                                <ul style={{ listStyle: 'none', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {analysis.strengths.map((s, i) => (
                                                        <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                                            {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Section>
                                        )}
                                        {analysis.challenges?.length > 0 && (
                                            <Section title="Desafios" icon={<WarningIcon size={20} />}>
                                                <ul style={{ listStyle: 'none', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {analysis.challenges.map((c, i) => (
                                                        <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                                            {c}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Section>
                                        )}
                                    </div>
                                )}

                                {/* Suggested Features */}
                                {analysis?.suggestedFeatures?.length > 0 && (
                                    <Section title="Funcionalidades Sugeridas" icon={<WrenchIcon size={20} />}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {analysis.suggestedFeatures.map((f, i) => (
                                                <span key={i} style={{
                                                    background: 'var(--accent-soft)',
                                                    color: 'var(--accent)',
                                                    padding: '4px 12px',
                                                    borderRadius: 100,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                }}>
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {/* Visual Identity */}
                                {analysis?.visualIdentitySuggestions && (
                                    <Section title="Identidade Visual Sugerida" icon={<PaletteIcon size={20} />}>
                                        <InfoRow label="Estilo" value={analysis.visualIdentitySuggestions.style} />
                                        <InfoRow label="Tom" value={analysis.visualIdentitySuggestions.tone} />
                                        {analysis.visualIdentitySuggestions.colors?.length > 0 && (
                                            <div style={{ marginTop: 12 }}>
                                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cores sugeridas</span>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    {analysis.visualIdentitySuggestions.colors.map((c, i) => (
                                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                            <div style={{
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: 8,
                                                                background: c,
                                                                border: '1px solid var(--border-primary)',
                                                            }} />
                                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{c}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Section>
                                )}

                                {/* Extra Info */}
                                <Section title="Detalhes Adicionais" icon="📊">
                                    <InfoRow label="Tipo de negócio" value={analysis?.businessType} />
                                    <InfoRow label="Público-alvo" value={analysis?.targetAudience} />
                                    <InfoRow label="Orçamento estimado" value={analysis?.estimatedBudget} />
                                </Section>
                            </>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🤖</div>
                                <h3 style={{ fontSize: 18, marginBottom: 8 }}>Sem análise IA</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                                    Clique em &quot;Analisar com IA&quot; para gerar um relatório completo
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleReview}
                                    disabled={reviewing}
                                >
                                    {reviewing ? <><span className="spinner" /> Analisando...</> : '🤖 Analisar com IA'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
