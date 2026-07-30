import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function fetchCNAEs() {
  console.log('Fetching CNAE subclasses from IBGE...');
  try {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses');
    if (!res.ok) throw new Error(`IBGE returned ${res.status}`);
    const data = await res.json();
    
    // Map to simple structure
    const cnaes = data.map(item => ({
      id: item.id, // e.g. "0111301"
      descricao: item.descricao
    }));

    fs.writeFileSync(path.join(PUBLIC_DIR, 'cnae.json'), JSON.stringify(cnaes));
    console.log(`Saved ${cnaes.length} CNAEs.`);
  } catch (err) {
    console.error('Failed to fetch CNAEs:', err.message);
  }
}

async function fetchLocations() {
  console.log('Fetching States from Brasil API...');
  try {
    const resUf = await fetch('https://brasilapi.com.br/api/ibge/uf/v1');
    if (!resUf.ok) throw new Error(`Brasil API UF returned ${resUf.status}`);
    const ufs = await resUf.json();
    
    const locations = {};
    
    // Fetch cities for each UF
    for (const uf of ufs) {
      console.log(`Fetching cities for ${uf.sigla}...`);
      const resCities = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${uf.sigla}`);
      if (!resCities.ok) {
        console.error(`Failed to fetch cities for ${uf.sigla}`);
        continue;
      }
      const cities = await resCities.json();
      locations[uf.sigla] = {
        nome: uf.nome,
        cidades: cities.map(c => c.nome)
      };
      
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
    
    fs.writeFileSync(path.join(PUBLIC_DIR, 'locations.json'), JSON.stringify(locations));
    console.log(`Saved locations for ${Object.keys(locations).length} states.`);
  } catch (err) {
    console.error('Failed to fetch locations:', err.message);
  }
}

async function run() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  
  await fetchCNAEs();
  await fetchLocations();
  console.log('Done.');
}

run();
