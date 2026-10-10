import Notification from '../models/Notification.js';
import { emitToUser } from '../sockets/io.js';
import logger from '../utils/logger.js';

// Notifications are shown inside the web app only: saved for the bell icon,
// and pushed live over Socket.io when the app is open.
// SMS is used only for OTP login (see otp.service.js).
// type: request_sent | approved | rejected | reminder | your_turn | queue_update | follow_up | system
export const notifyUser = async (userId, { type, title, message, data }) => {
  try {
    const saved = await Notification.create({ user: userId, type, title, message, data });

    emitToUser(userId, 'notification', {
      id: saved._id,
      type,
      title,
      message,
      data,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    logger.error(`Notification failed: ${err.message}`);
  }
};