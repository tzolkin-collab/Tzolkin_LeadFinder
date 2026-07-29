'use client';

import { useRouter } from 'next/navigation';

export default function DataDeletionPage() {
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
                        <span style={{ fontWeight: 600, fontSize: 16 }}>Instruções de Exclusão de Dados</span>
                    </div>
                </div>
            </header>

            <main className="container" style={{ paddingTop: 40, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
                <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ marginBottom: 40 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Instruções de Exclusão de Dados</h1>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                            Última atualização: 23 de março de 2026
                        </p>
                    </div>

                    <div className="card" style={{ padding: 32 }}>
                        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: 14 }}>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    1. Como excluir seus dados do Tzolkin Tracer
                                </h2>
                                <p>
                                    De acordo com os regulamentos da Meta para Aplicativos e Sites, devemos fornecer uma URL de retorno de chamada de exclusão de dados ou uma URL de instruções de exclusão de dados.
                                    Se você deseja excluir suas atividades para o aplicativo Tzolkin Tracer, pode fazê-lo seguindo estas etapas:
                                </p>
                                <ol style={{ marginLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <li>Vá para as Configurações e Privacidade do seu perfil do Facebook. Clique em &quot;Configurações&quot;.</li>
                                    <li>Role para baixo e clique em &quot;Aplicativos e Sites&quot;.</li>
                                    <li>Procure e clique em &quot;Tzolkin Tracer&quot;.</li>
                                    <li>Clique no botão &quot;Remover&quot;.</li>
                                </ol>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    2. Solicitação direta de exclusão
                                </h2>
                                <p>
                                    Se você deseja que excluamos permanentemente seus dados de nossa base de dados interna (como seu perfil de usuário criado no painel de gerenciamento), você pode enviar uma solicitação direta:
                                </p>
                                <ul style={{ marginLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li><strong>Email:</strong> suporte@leadfinder.com.br</li>
                                    <li><strong>Assunto:</strong> Solicitação de Exclusão de Dados - [Seu Nome/Email]</li>
                                    <li><strong>Prazo:</strong> Processaremos sua solicitação em até 48 horas úteis.</li>
                                </ul>
                            </section>

                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    3. Dados que são removidos
                                </h2>
                                <p>
                                    Ao solicitar a exclusão, removeremos:
                                </p>
                                <ul style={{ marginLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>Suas informações de perfil de usuário (nome, email).</li>
                                    <li>Tokens de acesso vinculados à sua conta (se houver).</li>
                                    <li>Histórico de buscas personalizadas associado ao seu ID de usuário.</li>
                                </ul>
                                <p style={{ marginTop: 12 }}>
                                    <em>Nota: Dados públicos de empresas coletados via Google Places não são vinculados a usuários específicos e permanecem na base para fins de cache do sistema, a menos que a própria empresa solicite a remoção.</em>
                                </p>
                            </section>

                            <section>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    4. Confirmação
                                </h2>
                                <p>
                                    Assim que os dados forem removidos, enviaremos um e-mail de confirmação para o endereço registrado em nossa plataforma.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
