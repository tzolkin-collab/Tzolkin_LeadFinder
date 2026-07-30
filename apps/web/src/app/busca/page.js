'use client';

import React, { useState, useEffect } from 'react';
import './busca.css';
import { AppShell } from '../../components/shell/AppShell.js';
import { 
  List, ChevronDown, ChevronUp, Building2, Building, Lock, MapPin, 
  Users, Factory, Hash, Sparkles, TrendingUp, Globe, 
  Cloud, DollarSign, Coins, Briefcase, Activity, 
  Radio, User, GitBranch, FileBox, Search, X
} from 'lucide-react';

// Componente local para lidar com o Avatar sem quebrar o DOM do React
const CompanyAvatar = ({ company }) => {
  const [imgError, setImgError] = useState(false);
  
  if (imgError) {
    return <div className="busca-td-avatar">{company.name.charAt(0)}</div>;
  }

  return (
    <div className="busca-td-avatar" style={{ background: 'transparent', padding: 0 }}>
      <img 
        src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`} 
        alt={company.name}
        style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'contain' }}
        onError={() => setImgError(true)}
      />
    </div>
  );
};

export default function BuscaPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('total');
  const [expandedAccordion, setExpandedAccordion] = useState(null);
  
  // State to hold applied filters
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Novos estados para a Busca
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Lista de IDs salvos
  const [savedLeads, setSavedLeads] = useState(new Set());

  // Função para salvar lead
  const handleSaveLead = async (businessId) => {
    try {
      const res = await fetch('/api/lists/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, listName: 'Campanha Q3' })
      });
      const data = await res.json();
      if (data.success) {
        setSavedLeads(prev => {
          const newSet = new Set(prev);
          newSet.add(businessId);
          return newSet;
        });
      }
    } catch (err) {
      console.error("Erro ao salvar lead:", err);
    }
  };

  // Hook para buscar dados da API quando os filtros mudam
  useEffect(() => {
    const fetchResults = async () => {
      if (activeFilters.length === 0) {
         setSearchResults([]);
         setHasSearched(false);
         return;
      }

      setIsLoading(true);
      setHasSearched(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: activeFilters })
        });
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
        }
      } catch (err) {
        console.error("Erro ao buscar leads:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [activeFilters]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      toggleFilter('Busca IA', searchQuery);
      setSearchQuery('');
    }
  };

  const toggleAccordion = (idx, locked) => {
    if (locked) return;
    setExpandedAccordion(prev => prev === idx ? null : idx);
  };

  const toggleFilter = (category, value) => {
    setActiveFilters(prev => {
      const exists = prev.find(f => f.category === category && f.value === value);
      if (exists) {
        return prev.filter(f => !(f.category === category && f.value === value));
      }
      return [...prev, { category, value }];
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  const isFilterActive = (category, value) => {
    return activeFilters.some(f => f.category === category && f.value === value);
  };

  const iconColor = "var(--text-tertiary, #949494)";

  const accordionItems = [
    { icon: <List size={16} color={iconColor} />, label: "Listas", locked: false, content: "MockCheckbox" },
    { icon: <Building2 size={16} color={iconColor} />, label: "Empresa", locked: false, content: "MockInput" },
    { icon: <MapPin size={16} color={iconColor} />, label: "Localização", locked: false, content: "MockInput" },
    { icon: <Users size={16} color={iconColor} />, label: "Funcionários", locked: false, content: "MockCheckbox" },
    { icon: <Factory size={16} color={iconColor} />, label: "Setor & Palavras-chave", locked: false, content: "MockInput" },
    { icon: <List size={16} color={iconColor} />, label: "Segmentos de Mercado", locked: false, content: "MockCheckbox" },
    { icon: <Hash size={16} color={iconColor} />, label: "CNAE", locked: false, content: "MockInput" },
    { icon: <Sparkles size={16} color={iconColor} />, label: "Filtros de IA", locked: false, content: "MockInput" },
    { icon: <TrendingUp size={16} color={iconColor} />, label: "Intenção de Compra", locked: false, content: "MockCheckbox" },
    { icon: <Cloud size={16} color={iconColor} />, label: "Tecnologias", locked: false, content: "MockCheckbox" },
    { icon: <Globe size={16} color={iconColor} />, label: "Visitantes do Site (Enterprise)", locked: true },
    { icon: <DollarSign size={16} color={iconColor} />, label: "Faturamento", locked: true },
    { icon: <Coins size={16} color={iconColor} />, label: "Investimento", locked: true },
    { icon: <Briefcase size={16} color={iconColor} />, label: "Vagas de Emprego", locked: true },
    { icon: <Activity size={16} color={iconColor} />, label: "Pontuação (Scores)", locked: true },
    { icon: <Radio size={16} color={iconColor} />, label: "Sinais", locked: false, content: "MockCheckbox" },
    { icon: <User size={16} color={iconColor} />, label: "Proprietário", locked: false, content: "MockCheckbox" },
    { icon: <GitBranch size={16} color={iconColor} />, label: "Estágio", locked: false, content: "MockCheckbox" },
    { icon: <FileBox size={16} color={iconColor} />, label: "Campos Personalizados", locked: false, content: "MockInput" },
  ];

  // Helper to render realistic checkboxes
  const renderMockCheckboxes = (category, options) => {
    return options.map(opt => (
      <label key={opt} className="busca-mock-checkbox" onClick={(e) => { e.preventDefault(); toggleFilter(category, opt); }}>
        <input type="checkbox" checked={isFilterActive(category, opt)} readOnly /> {opt}
      </label>
    ));
  };

  const hasSearchActive = activeFilters.length > 0;

  return (
    <AppShell>
      <div className="busca-layout">
        
        {/* Sidebar Filters */}
        <div className="busca-sidebar">
          
          {/* Top Tabs */}
          <div className="busca-sidebar-header">
            <div className="busca-tabs">
              <button 
                onClick={() => setActiveTab('total')}
                className={`busca-tab-btn ${activeTab === 'total' ? 'active' : ''}`}
              >
                <span>Total</span>
                <span className="busca-tab-count">28.9M</span>
              </button>
              <button 
                onClick={() => setActiveTab('netnew')}
                className={`busca-tab-btn ${activeTab === 'netnew' ? 'active' : ''}`}
              >
                <span>Novos</span>
                <span className="busca-tab-count">28.9M</span>
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`busca-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
              >
                <span>Salvos</span>
                <span className="busca-tab-count">0</span>
              </button>
            </div>
          </div>

          {/* Accordions */}
          <div className="busca-accordions">
            {accordionItems.map((item, idx) => {
              const isExpanded = expandedAccordion === idx;
              
              return (
                <div key={idx} className="busca-accordion-item">
                  <div 
                    className="busca-accordion-header" 
                    onClick={() => toggleAccordion(idx, item.locked)}
                  >
                    <div className="busca-accordion-left">
                      {item.icon}
                      <span className={`busca-accordion-label ${item.locked ? 'locked' : ''}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.locked ? (
                      <Lock size={14} color="var(--text-tertiary)" />
                    ) : isExpanded ? (
                      <ChevronUp size={16} color="var(--text-tertiary)" />
                    ) : (
                      <ChevronDown size={16} className="busca-chevron" />
                    )}
                  </div>
                  
                  {/* Expanded Content Mock */}
                  {isExpanded && !item.locked && (
                    <div className="busca-accordion-content">
                      
                      {item.label === "Tecnologias" && (
                        <div className="busca-mock-options">
                          <input type="text" placeholder="Pesquisar tecnologia..." className="busca-mock-input" style={{marginBottom: '8px'}} />
                          {renderMockCheckboxes("Tecnologias", ["WordPress", "Next.js", "Cloudflare", "Google Analytics", "Meta Pixel", "RD Station", "VTEX", "Nuvemshop", "Elementor"])}
                        </div>
                      )}

                      {item.label === "Funcionários" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Funcionários", ["1-10", "11-20", "21-50", "51-200", "201-500"])}
                        </div>
                      )}

                      {item.label === "Localização" && (
                        <div className="busca-mock-options">
                          <input type="text" placeholder="Pesquisar estado ou cidade..." className="busca-mock-input" style={{marginBottom: '8px'}} />
                          {renderMockCheckboxes("Localização", ["São Paulo (Estado)", "São Paulo (Cidade)", "Minas Gerais", "Belo Horizonte", "Rio de Janeiro"])}
                        </div>
                      )}

                      {item.label === "Listas" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Listas", ["Leads Frios SP", "Contatos de Ontem", "Campanha Q3"])}
                        </div>
                      )}

                      {item.label === "Setor & Palavras-chave" && (
                        <div className="busca-mock-options">
                          <input type="text" placeholder="Ex: e-commerce, saúde..." className="busca-mock-input" style={{marginBottom: '8px'}} />
                          {renderMockCheckboxes("Setor & Palavras-chave", ["Clínica odontológica", "Academia de ginástica", "Escritório de contabilidade", "Tecnologia", "Varejo"])}
                        </div>
                      )}

                      {item.label === "Segmentos de Mercado" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Segmentos de Mercado", ["B2B", "B2C", "SaaS", "E-commerce"])}
                        </div>
                      )}

                      {item.label === "Intenção de Compra" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Intenção de Compra", ["Alta (Ativo)", "Média (Pesquisando)"])}
                        </div>
                      )}

                      {item.label === "Sinais" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Sinais", ["Contratando", "Mudança de Cargo", "Expansão"])}
                        </div>
                      )}

                      {item.label === "Estágio" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Estágio", ["Semente", "Série A", "Bootstrapped"])}
                        </div>
                      )}

                      {item.label === "Proprietário" && (
                        <div className="busca-mock-options">
                          {renderMockCheckboxes("Proprietário", ["Meu Nome", "Time de Vendas"])}
                        </div>
                      )}

                      {item.content === "MockInput" && !["Tecnologias", "Localização", "Setor & Palavras-chave"].includes(item.label) && (
                        <div className="busca-mock-input-wrap">
                          <input type="text" placeholder={`Buscar ${item.label.toLowerCase()}...`} className="busca-mock-input" />
                          <button className="busca-mock-btn">Adicionar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="busca-sidebar-footer">
            <button className="busca-clear-btn" onClick={clearFilters}>
              Limpar filtros
            </button>
            <button className="busca-view-filters-btn">
              Ver +30 Filtros
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`busca-main ${hasSearchActive ? 'active-search' : ''}`}>
          
          {hasSearchActive && (
            <div className="busca-active-filters-bar">
               <div className="busca-active-filters-list">
                 <span className="busca-active-filters-label">Filtros ativos:</span>
                 {activeFilters.map((f, i) => (
                   <span key={i} className="busca-active-chip">
                     {f.category}: <strong>{f.value}</strong>
                     <X size={12} className="busca-chip-remove" onClick={() => toggleFilter(f.category, f.value)} />
                   </span>
                 ))}
               </div>
            </div>
          )}

          {!hasSearchActive ? (
            <div className="busca-content-wrapper empty-state">
              <h1 className="busca-title">
                Use a IA da Tzolkin para encontrar os leads ideais
              </h1>
              
              {/* AI Search Bar */}
              <div className="busca-search-box">
                <div className="busca-search-icon-wrap">
                  <Sparkles color="var(--tzolkin-cyan, #38BDF8)" size={24} />
                </div>
                <input 
                  type="text" 
                  className="busca-search-input"
                  placeholder="Exemplo: Liste clínicas médicas de alto padrão em São Paulo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
                <div className="busca-search-submit-wrap">
                   <button className="busca-search-submit" onClick={() => {
                      if(searchQuery.trim()) { toggleFilter('Busca IA', searchQuery); setSearchQuery(''); }
                   }}>
                     <Search size={20} color="var(--text-primary, #f2f2f2)" />
                   </button>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="busca-quick-filters">
                <h3 className="busca-quick-filters-title">Filtros Rápidos</h3>
                <div className="busca-quick-filters-grid">
                  <div>
                    <p className="busca-qf-col-title">Localização</p>
                    <div className="busca-qf-tags">
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Localização", "Brasil")}>Brasil</button>
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Localização", "São Paulo")}>São Paulo</button>
                    </div>
                  </div>
                  <div>
                    <p className="busca-qf-col-title">Funcionários</p>
                    <div className="busca-qf-tags">
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Funcionários", "1-10")}>1-10</button>
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Funcionários", "11-20")}>11-20</button>
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Funcionários", "21-50")}>21-50</button>
                    </div>
                  </div>
                  <div>
                    <p className="busca-qf-col-title">Tecnologias</p>
                    <div className="busca-qf-tags">
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Tecnologias", "RD Station")}>RD Station</button>
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Tecnologias", "WordPress")}>WordPress</button>
                      <button className="busca-qf-tag" onClick={() => toggleFilter("Tecnologias", "Meta Pixel")}>Meta Pixel</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade Banner */}
              <div className="busca-upgrade-banner">
                <div className="busca-upgrade-left">
                  <div className="busca-upgrade-title">
                    <Lock size={16} color="var(--tzolkin-yellow, #FFD400)" />
                    <span className="busca-upgrade-title-text">Desbloquear filtros avançados:</span>
                  </div>
                  <div className="busca-upgrade-features">
                    <div className="busca-upgrade-feature"><DollarSign size={14} /> Faturamento</div>
                    <div className="busca-upgrade-feature"><Coins size={14} /> Investimento</div>
                    <div className="busca-upgrade-feature"><Globe size={14} /> Visitantes do Site</div>
                  </div>
                </div>
                <button className="busca-upgrade-btn">
                  Ver planos
                </button>
              </div>
            </div>
          ) : (
            <div className="busca-results-wrapper">
               <div className="busca-results-header">
                  <h2>Resultados Encontrados</h2>
                  <span className="busca-results-count">Exibindo {searchResults.length} leads</span>
               </div>
               
               {isLoading ? (
                 <div style={{padding: '40px', textAlign: 'center', color: '#949494'}}>Buscando leads no Data Engine...</div>
               ) : (
                 <table className="busca-mock-table">
                   <thead>
                     <tr>
                       <th>Empresa</th>
                       <th>Localização</th>
                       <th>Funcionários</th>
                       <th>Faturamento</th>
                       <th>Tecnologias</th>
                       <th>Ação</th>
                     </tr>
                   </thead>
                   <tbody>
                     {searchResults.map((company) => (
                       <tr key={company.id}>
                         <td>
                            <div className="busca-td-company">
                               <CompanyAvatar company={company} />
                               <div>
                                  <strong>{company.name}</strong>
                                  <span>{company.domain}</span>
                               </div>
                            </div>
                         </td>
                         <td>{company.location}</td>
                         <td>{company.employees}</td>
                         <td><span style={{color: '#4ade80'}}>{company.revenue}</span></td>
                         <td>
                            <div className="busca-td-techs">
                               {company.technologies?.map(t => (
                                 <span key={t}>{t}</span>
                               ))}
                            </div>
                         </td>
                         <td>
                           <button 
                             className="busca-td-save" 
                             style={{ 
                               backgroundColor: savedLeads.has(company.id) ? '#22c55e' : '', 
                               color: savedLeads.has(company.id) ? '#fff' : ''
                             }}
                             onClick={() => handleSaveLead(company.id)}
                           >
                             {savedLeads.has(company.id) ? "Salvo ✓" : "Salvar"}
                           </button>
                         </td>
                       </tr>
                     ))}
                     {searchResults.length === 0 && (
                        <tr>
                           <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#949494'}}>Nenhuma empresa encontrada com esses filtros.</td>
                        </tr>
                     )}
                   </tbody>
                 </table>
               )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
