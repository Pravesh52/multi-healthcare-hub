import twilio from 'twilio';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

let client = null;
const getClient = () => {
  if (!client) client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return client;
};

export const sendSms = async (phone, body) => {
  const to = `+91${phone}`;

  if (env.otpDevMode || !env.TWILIO_ACCOUNT_SID) {
    logger.info(`[DEV SMS] to ${to}: ${body}`);
    return { dev: true };
  }

  await getClient().messages.create({ to, from: env.TWILIO_PHONE_NUMBER, body });
  return { dev: false };
};