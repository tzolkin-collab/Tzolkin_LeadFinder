'use client';

import { useRouter } from 'next/navigation';

export default function TermsOfUsePage() {
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
                        <span style={{ fontWeight: 600, fontSize: 16 }}>Termos de Uso</span>
                    </div>
                </div>
            </header>

            <main className="container" style={{ paddingTop: 40, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
                <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ marginBottom: 40 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Termos de Uso</h1>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                            Última atualização: 23 de março de 2026
                        </p>
                    </div>

                    <div className="card" style={{ padding: 32 }}>
                        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: 14 }}>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    1. Aceitação dos Termos
                                </h2>
                                <p>
                                    Ao acessar ou utilizar o Lead Finder, você concorda em estar vinculado a estes Termos de Uso.
                                    Se você não concordar com qualquer parte destes termos, não deve utilizar a aplicação.
                                    O uso continuado da plataforma constitui aceitação de quaisquer atualizações destes termos.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    2. Descrição do Serviço
                                </h2>
                                <p>
                                    O Lead Finder é uma ferramenta de prospecção que identifica empresas sem presença digital
                                    adequada (websites), utilizando dados públicos do Google Places, redes sociais e análise
                                    por inteligência artificial para gerar relatórios e recomendações de abordagem comercial.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    3. Uso Permitido
                                </h2>
                                <p style={{ marginBottom: 12 }}>Você concorda em utilizar o Lead Finder apenas para:</p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>Prospecção comercial legítima e ética</li>
                                    <li>Análise de oportunidades de negócio</li>
                                    <li>Geração de relatórios para uso interno da sua empresa</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    4. Uso Proibido
                                </h2>
                                <p style={{ marginBottom: 12 }}>Você não deve:</p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>Utilizar os dados coletados para spam, assédio ou contato não solicitado em massa</li>
                                    <li>Revender ou redistribuir os dados obtidos pela plataforma</li>
                                    <li>Utilizar a aplicação para fins ilegais ou que violem direitos de terceiros</li>
                                    <li>Tentar acessar dados sem autorização ou burlar mecanismos de segurança</li>
                                    <li>Sobrecarregar intencionalmente os servidores com requisições excessivas</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    5. Propriedade Intelectual
                                </h2>
                                <p>
                                    Toda a propriedade intelectual relacionada ao Lead Finder — incluindo código-fonte, design,
                                    algoritmos e documentação — pertence aos seus desenvolvedores. Os relatórios gerados pela
                                    plataforma podem ser utilizados livremente para fins comerciais pelo usuário autorizado.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    6. APIs de Terceiros
                                </h2>
                                <p style={{ marginBottom: 12 }}>
                                    O Lead Finder integra-se com serviços de terceiros. Ao utilizar nossa plataforma,
                                    você também concorda com os termos de:
                                </p>
                                <ul style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>
                                        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer"
                                            style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                            Google Cloud Platform / Places API ↗
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://openai.com/terms" target="_blank" rel="noopener noreferrer"
                                            style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                            OpenAI ↗
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://serper.dev/terms" target="_blank" rel="noopener noreferrer"
                                            style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                            Serper.dev ↗
                                        </a>
                                    </li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    7. Limitação de Responsabilidade
                                </h2>
                                <p>
                                    O Lead Finder é fornecido &quot;como está&quot;, sem garantias de qualquer tipo, expressas ou implícitas.
                                    Não nos responsabilizamos por decisões comerciais tomadas com base nos dados ou análises
                                    gerados pela plataforma. As análises de IA são estimativas e não devem ser consideradas
                                    como aconselhamento profissional definitivo.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    8. Disponibilidade do Serviço
                                </h2>
                                <p>
                                    Nos esforçamos para manter o serviço disponível, mas não garantimos uptime ininterrupto.
                                    Podemos suspender temporariamente o acesso para manutenção, atualizações ou correções
                                    de segurança sem aviso prévio.
                                </p>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    9. Alterações nos Termos
                                </h2>
                                <p>
                                    Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas
                                    serão comunicadas através da plataforma. O uso continuado após as alterações implica
                                    aceitação dos novos termos.
                                </p>
                            </section>

                            <section>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    10. Foro e Legislação Aplicável
                                </h2>
                                <p>
                                    Estes termos são regidos pelas leis da República Federativa do Brasil. Eventuais litígios
                                    serão resolvidos no foro da comarca da sede da empresa, com exclusão de qualquer outro,
                                    por mais privilegiado que seja.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
