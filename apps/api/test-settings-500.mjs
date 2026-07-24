import http from 'http';

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 3001,
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('=== TESTANDO ROTAS DE SETTINGS (/api/settings/costs e /api/settings/users) ===');

  // 1. Authenticate to get JWT token
  const authRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify({ email: 'admin@tzolkin.com.br', password: 'admin123' }));
    req.end();
  });

  console.log('Auth login response:', authRes.status);
  const authData = JSON.parse(authRes.body);
  const token = authData.token;
  console.log('Token obtido com sucesso:', token ? 'SIM' : 'NÃO');

  // 2. Test /api/settings/costs
  const costsRes = await makeRequest('/api/settings/costs', token);
  console.log('\n/api/settings/costs -> Status:', costsRes.status, 'Body:', costsRes.body);

  // 3. Test /api/settings/users
  const usersRes = await makeRequest('/api/settings/users', token);
  console.log('\n/api/settings/users -> Status:', usersRes.status, 'Body:', usersRes.body);
}

test().catch(console.error);
