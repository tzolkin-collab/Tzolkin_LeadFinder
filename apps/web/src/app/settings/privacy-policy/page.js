'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
    const router = useRouter();

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
                        <button className="btn btn-ghost" onClick={() => router.push('/settings')} id="back-btn">
                            ← Configurações
                        </button>
                        <span style={{ color: 'var(--border-secondary)' }}>|</span>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>Política de Privacidade</span>
                    </div>
                </div>
            </header>

            <main className="container" style={{ paddingTop: 40, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
                <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ marginBottom: 40 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Política de Privacidade</h1>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                            Última atualização: 23 de março de 2026
                        </p>
                    </div>

                    <div className="card" style={{ padding: 32 }}>
                        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: 14 }}>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    1. Introdução
                                </h2>
                                <p>
                                    O Lead Finder (&quot;nós&quot;, &quot;nosso&quot; ou &quot;aplicação&quot;) está comprometido com a proteção da privacidade
                                    dos nossos usuários. Esta Política de Privacidade explica como coletamos, usamos, armazenamos
                                    e compartilhamos informações quando você utiliza nossa plataforma de prospecção de clientes.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    2. Dados que Coletamos
                                </h2>
                                <p style={{ marginBottom: 12 }}>Coletamos os seguintes tipos de informação:</p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Dados públicos de empresas:</strong> Nome, endereço, telefone, categoria, avaliações,
                                        fotos e URLs obtidos via Google Places API.</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Dados públicos de redes sociais:</strong> Informações públicas do Instagram como bio,
                                        número de seguidores e links do perfil.</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Dados de uso:</strong> Informações sobre como você interage com a aplicação,
                                        incluindo buscas realizadas e análises solicitadas.</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Dados de autenticação:</strong> Credenciais de acesso ao sistema.</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    3. Como Usamos os Dados
                                </h2>
                                <p style={{ marginBottom: 12 }}>Utilizamos as informações coletadas para:</p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>Identificar e qualificar potenciais clientes sem presença digital adequada</li>
                                    <li>Gerar análises através de inteligência artificial (OpenAI GPT)</li>
                                    <li>Fornecer relatórios detalhados sobre oportunidades de negócio</li>
                                    <li>Melhorar a precisão e relevância dos resultados</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    4. Compartilhamento de Dados
                                </h2>
                                <p style={{ marginBottom: 12 }}>Podemos compartilhar dados com os seguintes terceiros:</p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Google Cloud Platform:</strong> Para consultas via Google Places API</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>OpenAI:</strong> Para geração de análises com IA (dados são enviados anonimizados)</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Serper.dev:</strong> Para buscas relacionadas a perfis de Instagram</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Meta:</strong> Para verificação de anúncios ativos na plataforma</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    5. Armazenamento e Segurança
                                </h2>
                                <p>
                                    Os dados são armazenados em banco de dados PostgreSQL com acesso restrito. Implementamos medidas
                                    de segurança técnicas e organizacionais para proteger as informações, incluindo criptografia em
                                    trânsito e controle de acesso baseado em autenticação.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    6. Direitos do Titular (LGPD)
                                </h2>
                                <p style={{ marginBottom: 12 }}>
                                    Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito a:
                                </p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>Confirmar a existência de tratamento de dados</li>
                                    <li>Acessar, corrigir ou solicitar a exclusão dos seus dados</li>
                                    <li>Solicitar a portabilidade dos dados</li>
                                    <li>Revogar o consentimento a qualquer momento</li>
                                    <li>Obter informações sobre entidades com as quais compartilhamos dados</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    7. Cookies e Tecnologias de Rastreamento
                                </h2>
                                <p>
                                    Utilizamos armazenamento local (localStorage) para manter sua sessão autenticada.
                                    Não utilizamos cookies de terceiros para rastreamento ou publicidade.
                                </p>
                            </section>

                            <section>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    8. Contato
                                </h2>
                                <p>
                                    Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato
                                    pelo email: <span style={{ color: 'var(--accent)' }}>contato@leadfinder.com.br</span>
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
