import { NextResponse } from 'next/server';
// Nota: Em um ambiente real Next.js usando o Prisma workspace configurado, 
// o importe seria a partir de 'database' ou '@tzolkin/database'.
// Para o PoC, vamos simular a resposta estrutural que a UI espera.

export async function POST(request) {
  try {
    const body = await request.json();
    const { filters } = body;
    
    console.log("[Search API] Recebido payload de filtros:", filters);

    // Simulando um banco de dados relacional baseado na tabela CanonicalBusiness e Observations.
    // Em produção, isso faria: 
    // prisma.canonicalBusiness.findMany({ where: { observations: { some: { payload: { path: ['technologies'], array_contains: "wordpress" } } } } })
    
    // Base Dummy simulando retorno do DB com a nova arquitetura
    const canonicalDatabaseMock = [
      {
        id: "cms6mqz1e0001lstf2hqlrxes",
        name: "Clínica Sorriso Pleno",
        domain: "odontoclinic.com.br",
        linkedin: "linkedin.com/company/odontoclinic",
        description: "Clínica odontológica de ponta.",
        location: "Belo Horizonte, MG",
        employees: "11-20",
        industry: "Clínica odontológica",
        technologies: ["WordPress", "Meta Pixel"],
        revenue: "R$ 360 mil - R$ 4.8 milhões"
      },
      {
        id: "cms6mr3pe000flstf1ryh5ued",
        name: "Academia Fibra Total",
        domain: "smartfit.com.br",
        linkedin: "linkedin.com/company/smartfit",
        description: "Academia de ginástica e musculação.",
        location: "Belo Horizonte, MG",
        employees: "21-50",
        industry: "Academia de ginástica",
        technologies: ["Next.js", "Cloudflare"],
        revenue: "R$ 4.8 milhões - R$ 20 milhões"
      },
      {
        id: "cms70xh6e000v9gtf66zttrvx",
        name: "Contabilidade Horizonte",
        domain: "totvs.com",
        linkedin: "linkedin.com/company/totvs",
        description: "Assessoria contábil para empresas.",
        location: "Betim, MG",
        employees: "1-10",
        industry: "Escritório de contabilidade",
        technologies: ["WordPress", "Google Analytics", "RD Station"],
        revenue: "Até R$ 360 mil"
      }
    ];

    // Lógica de Filtro Relacional Simulado
    let results = [...canonicalDatabaseMock];

    if (filters && filters.length > 0) {
      const techFilters = filters.filter(f => f.category === "Tecnologias").map(f => f.value);
      const locFilters = filters.filter(f => f.category === "Localização").map(f => f.value);
      const empFilters = filters.filter(f => f.category === "Funcionários").map(f => f.value);
      const indFilters = filters.filter(f => f.category === "Setor & Palavras-chave").map(f => f.value);
      
      if (techFilters.length > 0) {
          results = results.filter(company => 
            techFilters.some(tech => company.technologies.includes(tech))
          );
      }
      
      if (locFilters.length > 0) {
          results = results.filter(company => 
            // Mock logic: SP/MG cities mapped to "São Paulo" / "Belo Horizonte" etc. 
            locFilters.some(loc => company.location.includes(loc.split(" ")[0]))
          );
      }

      if (empFilters.length > 0) {
          results = results.filter(company => 
            empFilters.includes(company.employees)
          );
      }

      if (indFilters.length > 0) {
          results = results.filter(company => 
            indFilters.includes(company.industry)
          );
      }
    }

    return NextResponse.json({ 
        success: true, 
        count: results.length,
        data: results 
    });

  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
