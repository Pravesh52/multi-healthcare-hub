import 'dotenv/config';
import crypto from 'crypto';

const [mode, a, b] = process.argv.slice(2);

if (mode === 'verify' && a && b) {
  // node scripts/payment-sign.js verify <order_id> <payment_id>
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${a}|${b}`).digest('hex');
  console.log('razorpay_signature:', sig);
} else if (mode === 'webhook' && a) {
  // node scripts/payment-sign.js webhook '<exact json body>'
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(a).digest('hex');
  console.log('x-razorpay-signature:', sig);
} else {
  console.log("Usage:\n  node scripts/payment-sign.js verify <order_id> <payment_id>\n  node scripts/payment-sign.js webhook '<json body>'");
}