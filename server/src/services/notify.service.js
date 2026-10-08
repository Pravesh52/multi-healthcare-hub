import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendSms } from './sms.service.js';
import { emitToUser } from '../sockets/io.js';
import logger from '../utils/logger.js';

// type: request_sent | approved | rejected | reminder | your_turn | queue_update | follow_up | system
export const notifyUser = async (userId, { type, title, message, data }, { sms = false } = {}) => {
  try {
    const saved = await Notification.create({ user: userId, type, title, message, data });

    // Live push to every open tab/device of this user
    emitToUser(userId, 'notification', {
      id: saved._id,
      type,
      title,
      message,
      data,
      createdAt: saved.createdAt,
    });

    if (sms) {
      const user = await User.findById(userId).select('phone');
      if (user?.phone) await sendSms(user.phone, message);
    }
  } catch (err) {
    logger.error(`Notification failed: ${err.message}`);
  }
};