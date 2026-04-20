require('dotenv').config();
const fs = require('fs');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HTML_PATH = 'docs/trainer-v2-welcome-email.html';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in .env');
  process.exit(1);
}

(async () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  console.log('Sending welcome email to goldmohmmed@gmail.com...');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fluentia Academy <ali@fluentia.academy>',
      to: 'goldmohmmed@gmail.com',
      subject: '✨ أهلاً بك في Fluentia Portal V2 — طُوّر خصيصاً لك',
      html,
      reply_to: 'alialahmad2000@gmail.com',
    }),
  });

  const data = await res.json();
  if (data.id) {
    console.log(`✓ Email sent successfully.`);
    console.log(`  Resend ID: ${data.id}`);
    console.log(`  Check: https://resend.com/emails/${data.id}`);
  } else {
    console.log('✗ Send failed:', JSON.stringify(data));
    process.exit(1);
  }
})();
