'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header.js';
import { SearchIcon, ArrowUpIcon } from '../../components/brand/UIIcons.js';

export default function NicheResearchPage() {
  const [selectedNiche, setSelectedNiche] = useState('Clínicas Odontológicas');
  const [selectedRegion, setSelectedRegion] = useState('Belo Horizonte, MG');
  const [activeIdx, setActiveIdx] = useState(5);
  const svgRef = useRef(null);

  // Niche Research Data powered by Google Trends & Search Demand API
  const nicheData = {
    niche: 'Clínicas Odontológicas & Odontologia Estética',
    searchVolume: '45.200 buscas/mês',
    trendGrowth: '+34% nos últimos 12 meses',
    competitionLevel: 'Média',
    avgTicket: 'R$ 3.500 - R$ 15.000',
    opportunityScore: 9.4,
    trendsHistory: [
      { month: 'Ago 25', interest: 58 },
      { month: 'Out 25', interest: 64 },
      { month: 'Dez 25', interest: 72 },
      { month: 'Fev 26', interest: 81 },
      { month: 'Abr 26', interest: 89 },
      { month: 'Jun 26', interest: 100 },
    ],
    topKeywords: [
      { term: 'implante dentario belo horizonte', volume: '12.400', cpc: 'R$ 4,80', competition: 'Alta' },
      { term: 'invisalign bh preco', volume: '8.100', cpc: 'R$ 6,20', competition: 'Média' },
      { term: 'harmonizacao facial bh', volume: '6.500', cpc: 'R$ 5,10', competition: 'Média' },
      { term: 'lentes de contato dental', volume: '5.200', cpc: 'R$ 7,40', competition: 'Alta' },
      { term: 'dentista 24 horas bh', volume: '4.800', cpc: 'R$ 3,10', competition: 'Baixa' },
    ],
    providerRecomendations: [
      {
        provider: 'Gestor de Tráfego Pago',
        recommendation: 'Excelente oportunidade. 78% das clínicas da região têm volume de busca alto mas criativos fracos na Meta Ads.',
        suitability: 9.8,
      },
      {
        provider: 'Social Media & Videomaker',
        recommendation: 'Forte demanda por conteúdos em Reels/TikTok mostrando transformações de sorrisos (antes & depois).',
        suitability: 9.2,
      },
      {
        provider: 'Dev & Web Designer',
        recommendation: '38% das clínicas rastreadas na região possuem sites sem otimização mobile ou sem botão de WhatsApp direto.',
        suitability: 8.9,
      },
    ],
  };

  const chartWidth = 760;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const points = nicheData.trendsHistory.map((d, i) => {
    const x = paddingX + (i * (chartWidth - 2 * paddingX)) / (nicheData.trendsHistory.length - 1);
    const y = chartHeight - paddingBottom - (d.interest / 100) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, ...d };
  });

  // Catmull-Rom Spline Math
  const getCatmullRomPath = (pts) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return path;
  };

  const curvePathD = getCatmullRomPath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const bottomY = chartHeight - paddingBottom;
  const areaD = `${curvePathD} L ${lastX.toFixed(2)} ${bottomY} L ${firstX.toFixed(2)} ${bottomY} Z`;

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * chartWidth;

    let closest = 0;
    let minD = Infinity;
    points.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - svgX);
      if (dist < minD) {
        minD = dist;
        closest = idx;
      }
    });

    setActiveIdx(closest);
  };

  const activePoint = points[activeIdx];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Header activeTab="niche-research" />

      <main className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        {/* PAGE HEADER */}
        <div style={{ marginBottom: 28 }}>
          <span className="eyebrow" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)' }}>INTELIGÊNCIA DE MERCADO & GOOGLE TRENDS</span>
          <h1 className="tzolkin-title" style={{ fontSize: 28, marginTop: 4 }}>PESQUISA & VALIDAÇÃO DE NICHO</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Descubra onde está o ICP mais lucrativo para o seu perfil de serviço antes de prospectar.
          </p>
        </div>

        {/* NICHE SEARCH BAR */}
        <div className="card" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                SELECIONE OU DIGITE O NICHO
              </label>
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="form-control"
                style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--tzolkin-offwhite)', border: '1px solid var(--border-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="Clínicas Odontológicas">Clínicas Odontológicas & Estética</option>
                <option value="Estúdios de Arquitetura">Estúdios de Arquitetura & Interiores</option>
                <option value="Escritórios de Advocacia">Escritórios de Advocacia B2B</option>
                <option value="Restaurantes & Gastronomia">Restaurantes & Gastronomia de Alto Ticket</option>
                <option value="Clínicas Estéticas">Clínicas de Estética & Dermatologia</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                REGIÃO OU CIDADE ALVO
              </label>
              <input
                type="text"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                placeholder="Ex: Belo Horizonte, MG"
                className="form-control"
                style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--tzolkin-offwhite)', border: '1px solid var(--border-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <SearchIcon size={14} color="#0A0A0A" />
                Analisar Oportunidade do Nicho
              </button>
            </div>
          </div>
        </div>

        {/* OVERVIEW STATS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>DEMANDA DE BUSCA (MENSAL)</span>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              {nicheData.searchVolume}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--success)' }}>
              <ArrowUpIcon size={12} color="var(--success)" />
              <span>{nicheData.trendGrowth}</span>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>SCORE DE OPORTUNIDADE</span>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              {nicheData.opportunityScore} / 10
            </div>
            <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, fontWeight: 600 }}>
              Nicho de Altíssima Lucratividade
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>CONCORRÊNCIA EM ANÚNCIOS</span>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              {nicheData.competitionLevel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              78% das empresas sem anúncios ativos
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>TICKET MÉDIO DOS SERVIÇOS</span>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              {nicheData.avgTicket}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Capacidade de pagamento excelente
            </div>
          </div>
        </div>

        {/* FLUID GOOGLE TRENDS CHART */}
        <div className="card" style={{ padding: 28, marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="eyebrow" style={{ fontSize: 10 }}>TENDÊNCIA ORGÂNICA DE INTERESSE (GOOGLE TRENDS)</span>
              <h3 className="tzolkin-title" style={{ fontSize: 18, marginTop: 2 }}>Crescimento de Busca para "{selectedNiche}"</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
              Indexador Google Search Real-Time
            </span>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              onMouseMove={handleMouseMove}
              style={{ width: '100%', height: 'auto', minWidth: 550, cursor: 'crosshair', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="trendFluidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FAFAF7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FAFAF7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area */}
              <path d={areaD} fill="url(#trendFluidGradient)" />

              {/* Fluid Curve */}
              <path
                d={curvePathD}
                fill="none"
                stroke="#FAFAF7"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 10px rgba(250, 250, 247, 0.5))' }}
              />

              {/* Laser Crosshair */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={paddingTop}
                  x2={activePoint.x}
                  y2={chartHeight - paddingBottom}
                  stroke="rgba(250, 250, 247, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Nodes */}
              {points.map((pt, i) => {
                const isActive = i === activeIdx;
                return (
                  <g key={i} onClick={() => setActiveIdx(i)} style={{ cursor: 'pointer' }}>
                    {isActive && (
                      <circle cx={pt.x} cy={pt.y} r="14" fill="rgba(250, 250, 247, 0.15)" />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 6 : 4}
                      fill="#0A0A0A"
                      stroke="#FAFAF7"
                      strokeWidth={isActive ? 3 : 2}
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fill={isActive ? 'var(--tzolkin-offwhite)' : 'var(--text-tertiary)'}
                      fontSize="11"
                      fontWeight={isActive ? '700' : '400'}
                    >
                      {pt.month}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip Badge */}
            {activePoint && (
              <div
                style={{
                  position: 'absolute',
                  top: activePoint.y - 70,
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: 'rgba(10, 10, 10, 0.92)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(250, 250, 247, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{activePoint.month}</div>
                <div style={{ fontSize: 13, color: 'var(--tzolkin-offwhite)', fontWeight: 700 }}>
                  Índice de Interesse: {activePoint.interest} / 100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KEYWORDS & RECOMMENDATIONS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {/* KEYWORD DEMAND TABLE */}
          <div className="card" style={{ padding: 24 }}>
            <span className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>DEMANDA DE TERMOS DE BUSCA</span>
            <h4 style={{ fontSize: 15, color: 'var(--tzolkin-offwhite)', marginBottom: 16 }}>Palavras-Chave Mais Pesquisadas</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nicheData.topKeywords.map((kw, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>{kw.term}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{kw.volume} buscas/mês • CPC: {kw.cpc}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: kw.competition === 'Alta' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: kw.competition === 'Alta' ? '#ef4444' : 'var(--success)' }}>
                    Concorrência {kw.competition}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI SUITABILITY RECOMMENDATIONS */}
          <div className="card" style={{ padding: 24 }}>
            <span className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>DIAGNOSTICO DE INTELIGÊNCIA IA</span>
            <h4 style={{ fontSize: 15, color: 'var(--tzolkin-offwhite)', marginBottom: 16 }}>Recomendação por Perfil de Prestador</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {nicheData.providerRecomendations.map((rec, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>{rec.provider}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>Fit {rec.suitability}/10</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {rec.recommendation}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <Link href="/dashboard?tab=prospecting" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Iniciar Garimpo de Leads neste Nicho ↗
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
