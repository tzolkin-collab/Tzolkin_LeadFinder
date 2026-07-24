import pg from 'pg';

const connectionString = 'postgresql://postgres:3ad3550763e84d5864a7@easypanel.landcriativa.com:9000/tzolkin_lead_finder?sslmode=disable';

async function retryConnect() {
  console.log('=== AGUARDANDO LIBERAÇÃO DE SLOT NO POSTGRESQL ===');
  for (let attempt = 1; attempt <= 10; attempt++) {
    const client = new pg.Client({ connectionString });
    try {
      console.log(`Tentativa ${attempt}/10...`);
      await client.connect();
      console.log('✅ Conexão estabelecida! Encerrando conexões inativas no servidor...');
      const resKill = await client.query(`
        SELECT pg_terminate_backend(pid) 
        from pg_stat_activity 
        WHERE datname = 'tzolkin_lead_finder' 
          AND pid <> pg_backend_pid();
      `);
      console.log(`✅ Conexões inativas encerradas: ${resKill.rowCount}`);
      await client.end();
      return true;
    } catch (err) {
      console.log(`Tentativa ${attempt} falhou: ${err.message}`);
      try { await client.end(); } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

retryConnect();
