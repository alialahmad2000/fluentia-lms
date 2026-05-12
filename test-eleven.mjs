console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
console.log('Node version:', process.version);
console.log('Testing ElevenLabs from Node.js...');

const key = 'sk_554406f95cd9d19df18949f24e0756d9682013d710500f72';
try {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': key }
  });
  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Tier:', data.tier);
  console.log('Character limit:', data.character_limit?.toLocaleString());
  console.log('Characters used:', data.character_count?.toLocaleString());
  console.log('Remaining:', (data.character_limit - data.character_count)?.toLocaleString());
  console.log('SUCCESS!');
} catch (e) {
  console.error('FAILED:', e.message);
  console.error('Code:', e.cause?.code);
}
