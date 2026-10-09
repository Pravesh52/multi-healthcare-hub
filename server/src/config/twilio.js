import twilio from 'twilio';
import { env } from './env.js';

let client = null;

export const getTwilio = () => {
  if (!client) client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return client;
};