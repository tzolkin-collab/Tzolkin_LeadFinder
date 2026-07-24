'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Header } from '../../components/Header.js';
import { ArrowUpIcon, ArrowDownIcon } from '../../components/brand/UIIcons.js';

export default function DashboardsAnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const timeSeriesData = [
    { date: '01 Jul', apiCost: 2.10, revenue: 1800, leads: 6, margin: '99.8%' },
    { date: '05 Jul', apiCost: 3.40, revenue: 4200, leads: 12, margin: '99.9%' },
    { date: '10 Jul', apiCost: 2.80, revenue: 3100, leads: 9, margin: '99.9%' },
    { date: '15 Jul', apiCost: 5.60, revenue: 8900, leads: 21, margin: '99.9%' },
    { date: '20 Jul', apiCost: 4.20, revenue: 14500, leads: 28, margin: '99.9%' },
    { date: '25 Jul', apiCost: 3.10, revenue: 7800, leads: 15, margin: '99.9%' },
    { date: '30 Jul', apiCost: 4.80, revenue: 11200, leads: 19, margin: '99.9%' },
  ];

  const salesData = [
    { month: 'Ago', garimpados: 65, aceitas: 40 },
    { month: 'Set', garimpados: 80, aceitas: 55 },
    { month: 'Out', garimpados: 50, aceitas: 32 },
    { month: 'Nov', garimpados: 95, aceitas: 70 },
    { month: 'Dez', garimpados: 75, aceitas: 60 },
    { month: 'Jan', garimpados: 110, aceitas: 88 },
  ];

  const categoryData = [
    { label: 'Tráfego Pago & Ads', value: 38.5, color: '#10B981' },
    { label: 'Automação & IA', value: 28.4, color: '#6366F1' },
    { label: 'Web Design & LPs', value: 18.6, color: '#F59E0B' },
    { label: 'Social Media', value: 14.5, color: '#EC4899' },
  ];

  const infrastructureData = [
    { name: 'Apify Actors', cost: 12.10, percent: 46.5 },
    { name: 'OpenAI GPT-4o', cost: 8.40, percent: 32.3 },
    { name: 'Serper.dev', cost: 3.60, percent: 13.8 },
    { name: 'ScrapingBee', cost: 1.90, percent: 7.4 },
  ];

  const conversionData = [
    { channel: 'WhatsApp Direct', rate: 24.6, leads: '52 chamados' },
    { channel: 'LinkedIn Direto', rate: 18.2, leads: '28 contatados' },
    { channel: 'E-mail Comercial', rate: 9.4, leads: '30 enviados' },
  ];

  const servicesData = [
    { name: 'WhatsApp Automation', cat: 'SaaS', count: 42, growth: '+18%', ticket: 'R$ 4.500' },
    { name: 'Meta Ads Management', cat: 'Tráfego', count: 38, growth: '+12%', ticket: 'R$ 3.800' },
    { name: 'Landing Pages', cat: 'Design', count: 29, growth: '+24%', ticket: 'R$ 2.900' },
    { name: 'Social Media', cat: 'Social', count: 19, growth: '+5%', ticket: 'R$ 2.500' },
  ];

  const citiesData = [
    { city: 'São Paulo', leads: 22.5, percent: 85, share: '38%' },
    { city: 'Belo Horizonte', leads: 15.8, percent: 65, share: '27%' },
    { city: 'Rio de Janeiro', leads: 12.8, percent: 52, share: '22%' },
    { city: 'Curitiba', leads: 8.4, percent: 38, share: '13%' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Header activeTab="dashboards" />

      <main className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        {/* HEADER & FILTERS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="eyebrow" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)' }}>INTELIGÊNCIA DE INVESTIMENTO & RETORNO</span>
            <h1 className="tzolkin-title" style={{ fontSize: 28, marginTop: 4 }}>ANALYTICS & OPERATIONAL ROI</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Curva orgânica de desempenho: Gasto com APIs vs. Retorno Financeiro em Pipeline.
            </p>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: '1y', label: '1Y' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className="btn btn-sm"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-xs)',
                  background: period === p.id ? 'var(--tzolkin-offwhite)' : 'transparent',
                  color: period === p.id ? '#0A0A0A' : 'var(--text-tertiary)',
                  border: 'none',
                  transition: 'all 200ms ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="card" style={{ padding: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>INVESTIMENTO EM INFRAESTRUTURA</span>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              R$ 26,00
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--success)' }}>
              <ArrowDownIcon size={12} color="var(--success)" />
              <span>-18.4% de economia via cache</span>
            </div>
          </div>

          <div className="card" style={{ padding: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>OPORTUNIDADES EM PIPELINE</span>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              R$ 51.500
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--success)' }}>
              <ArrowUpIcon size={12} color="var(--success)" />
              <span>+36.2% em valor qualificado</span>
            </div>
          </div>

          <div className="card" style={{ padding: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>FATOR ROI OPERACIONAL</span>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              1.980x
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Margem bruta de 99.9% sobre custo de APIs
            </div>
          </div>

          <div className="card" style={{ padding: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>LEADS ALTA PRIORIDADE</span>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginTop: 8 }}>
              110 Leads
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Auditados com Dossiê Comercial IA
            </div>
          </div>
        </div>

        {/* MAIN RECHARTS CARD */}
        <div className="card" style={{ padding: 32, marginBottom: 28 }}>
          <div style={{ marginBottom: 28 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>EVOLUÇÃO TEMPORAL ORGÂNICA</span>
            <h3 className="tzolkin-title" style={{ fontSize: 20, marginTop: 2 }}>Curva de Retorno Financeiro vs. Custo de APIs</h3>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--tzolkin-offwhite)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 6 }} activeDot={{ r: 8 }} name="Oportunidades (R$)" />
              <Line type="monotone" dataKey="apiCost" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 5 }} name="Investimento APIs (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Infrastructure & Conversion Section */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <span className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>DISTRIBUIÇÃO DE INFRAESTRUTURA</span>
            <h4 style={{ fontSize: 15, color: 'var(--tzolkin-offwhite)', marginBottom: 16 }}>Consumo por Serviço de Inteligência</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {infrastructureData.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>R$ {item.cost.toFixed(2)} ({item.percent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${item.percent}%`, height: '100%', background: 'var(--tzolkin-offwhite)', opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <span className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>PERFORMANCE DE ABORDAGEM</span>
            <h4 style={{ fontSize: 15, color: 'var(--tzolkin-offwhite)', marginBottom: 16 }}>Taxa de Conversão por Canal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {conversionData.map((item, idx) => (
                <div key={idx} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>{item.channel}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.leads}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-sans)' }}>
                      {item.rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Performance & Distribution */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>PERFORMANCE DE VENDAS</span>
              <h4 style={{ fontSize: 16, color: 'var(--tzolkin-offwhite)', marginTop: 2 }}>Desempenho Mensal de Prospecção</h4>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" />
                <YAxis stroke="var(--text-tertiary)" />
                <Tooltip contentStyle={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(16,185,129,0.3)' }} />
                <Legend />
                <Bar dataKey="garimpados" fill="#3F3F46" name="Leads Garimpados" radius={[8, 8, 0, 0]} />
                <Bar dataKey="aceitas" fill="#10B981" name="Propostas Aceitas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>DISTRIBUIÇÃO POR SERVIÇO</span>
              <h4 style={{ fontSize: 16, color: 'var(--tzolkin-offwhite)', marginTop: 2 }}>Oportunidades por Categoria</h4>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Services Table & Geographic Density */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ fontSize: 10 }}>OFERTAS MAIS LUCRATIVAS</span>
                <h4 style={{ fontSize: 16, color: 'var(--tzolkin-offwhite)', marginTop: 2 }}>Top Serviços em Vendas</h4>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '8px 0' }}>Serviço</th>
                    <th style={{ padding: '8px 0' }}>Categoria</th>
                    <th style={{ padding: '8px 0', textAlign: 'center' }}>Propostas</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>{row.name}</td>
                      <td style={{ padding: '12px 0', color: 'var(--text-tertiary)' }}>{row.cat}</td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--tzolkin-offwhite)' }}>{row.count}</span>
                        <span style={{ fontSize: 10, color: '#10B981', marginLeft: 6 }}>({row.growth})</span>
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-sans)' }}>
                        {row.ticket}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ fontSize: 10 }}>DENSIDADE REGIONAL DE LEADS</span>
                <h4 style={{ fontSize: 16, color: 'var(--tzolkin-offwhite)', marginTop: 2 }}>Top Cidades com Mais ICPs</h4>
              </div>
              <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>+4.2% vs mês anterior</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {citiesData.map((loc, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--tzolkin-offwhite)' }}>{loc.city}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{loc.leads} ({loc.share})</span>
                  </div>
                  <div style={{ width: '100%', height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${loc.percent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
