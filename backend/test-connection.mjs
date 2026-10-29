import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);
const domain = 'gaqlctiutyvcrwiqwvaf.supabase.co';

async function diagnose() {
  console.log('----------------------------------------');
  console.log('1. Sinusubukan i-resolve ang DNS ng Supabase...');
  console.log('----------------------------------------');
  try {
    const address = await lookup(domain);
    console.log('✅ DNS SUCCESS! Nakita ang IP address:', address);
  } catch (err) {
    console.error('❌ DNS FAILED! Hindi ma-resolve ang domain:', err);
    console.log('-> Ibig sabihin nito, hinarang ng Windows DNS, Firewall, o ng Internet Provider mo ang domain na ito.');
    return;
  }

  console.log('----------------------------------------');
  console.log('2. Sinusubukan ang Direct Fetch sa Supabase API...');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`https://${domain}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'dummy-key-para-lang-sa-test'
      }
    });
    console.log('✅ FETCH SUCCESS! Sumagot ang server (Status):', response.status);
  } catch (err) {
    console.error('❌ FETCH FAILED! Error sa network request:', err);
  }
}

diagnose();