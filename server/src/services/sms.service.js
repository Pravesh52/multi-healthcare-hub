import { env } from '../config/env.js';
import { getTwilio } from '../config/twilio.js';
import logger from '../utils/logger.js';

export const sendSms = async (phone, body) => {
  const to = `+91${phone}`;

  if (env.otpDevMode || !env.TWILIO_ACCOUNT_SID) {
    logger.info(`[DEV SMS] to ${to}: ${body}`);
    return { dev: true };
  }

  await getTwilio().messages.create({ to, from: env.TWILIO_PHONE_NUMBER, body });
  return { dev: false };
};