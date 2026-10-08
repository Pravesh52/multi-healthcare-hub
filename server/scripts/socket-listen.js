import { io } from 'socket.io-client';

const token = process.argv[2];
if (!token) {
  console.log('Usage: node scripts/socket-listen.js <accessToken>');
  process.exit(1);
}

const socket = io(process.env.API_URL || 'http://localhost:5000', { auth: { token } });
const time = () => new Date().toLocaleTimeString();

socket.on('connect', () => console.log(`[${time()}] connected`));
socket.on('connect_error', (e) => console.log(`[${time()}] connect error: ${e.message}`));
socket.on('disconnect', (why) => console.log(`[${time()}] disconnected: ${why}`));

socket.on('queue:update', (q) => {
  console.log(`\n[${time()}] queue:update`);
  console.log('  now serving :', q.serving ? `#${q.serving.tokenNo} ${q.serving.patient?.name}` : 'nobody');
  console.log('  waiting     :', q.waiting.map((w) => `#${w.tokenNo}`).join(', ') || '-');
  console.log('  not arrived :', q.notArrived.map((w) => `#${w.tokenNo}`).join(', ') || '-');
  console.log('  completed   :', q.completedCount, '| paused:', q.paused);
});

socket.onAny((event, payload) => {
  if (event === 'queue:update') return;
  console.log(`\n[${time()}] ${event}`);
  console.log(JSON.stringify(payload, null, 2));
});