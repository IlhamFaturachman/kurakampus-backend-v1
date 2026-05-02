const fs = require('fs');
const path = require('path');
const net = require('net');
const dns = require('dns').promises;
const { Client } = require('pg');

// 1. Load .env manually
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('✅ Loaded .env file');
    } else {
      console.warn('⚠️ .env file not found');
    }
  } catch (e) {
    console.error('❌ Error loading .env:', e.message);
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse URL (naive parsing for standard postgres url)
// postgresql://user:pass@host:port/db?params
let url;
try {
  url = new URL(dbUrl);
} catch (e) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const host = url.hostname;
const port = url.port || 5432;
const protocol = url.protocol;

console.log(`\n🔍 Diagnosing connection to: ${host}:${port}`);

async function runDiagnostics() {
  try {
    // 2. DNS Resolution
    console.log('\n--- 1. DNS Resolution ---');
    const addresses = await dns.lookup(host, { all: true });
    console.log(`Resolved addresses for ${host}:`);
    addresses.forEach((addr) => {
      console.log(` - ${addr.family === 6 ? 'IPv6' : 'IPv4'}: ${addr.address}`);
    });

    // 3. TCP Connectivity Tests
    console.log('\n--- 2. TCP Connectivity ---');
    for (const addr of addresses) {
      await testTcp(addr.address, port, addr.family);
    }

    // 4. PG Client Connection Test
    console.log('\n--- 3. PG Client Connection (Application Simulation) ---');
    await testPgConnection();

  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
  }
}

function testTcp(address, port, family) {
  return new Promise((resolve) => {
    const type = family === 6 ? 'IPv6' : 'IPv4';
    console.log(`Testing TCP connection to ${type} ${address}:${port}...`);
    
    const start = Date.now();
    const socket = net.createConnection({ port, host: address, family }, () => {
      const time = Date.now() - start;
      console.log(`✅ TCP Connected to ${type} ${address} in ${time}ms`);
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      console.error(`❌ TCP Connection failed to ${type} ${address}: ${err.message}`);
      resolve(false);
    });

    socket.setTimeout(5000, () => {
      console.error(`❌ TCP Connection timed out to ${type} ${address}`);
      socket.destroy();
      resolve(false);
    });
  });
}

async function testPgConnection() {
  const isDev = process.env.NODE_ENV === 'development';
  // Config matching PrismaService
  const config = {
    connectionString: dbUrl,
    ssl: isDev ? { rejectUnauthorized: false } : true,
    connectionTimeoutMillis: 5000,
  };

  console.log(`Attempting pg.Client connect with ssl: ${JSON.stringify(config.ssl)}`);
  
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ PG Client Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Query successful: ${res.rows[0].now}`);
    await client.end();
  } catch (err) {
    console.error('❌ PG Client Connection failed:', err.message);
    if (err.message.includes('ssl') || err.message.includes('certificate')) {
       console.log('💡 Tip: Check SSL settings. Supabase usually requires SSL.');
    }
  }
}

runDiagnostics();
