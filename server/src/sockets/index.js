import { Server } from 'socket.io';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ROLES } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { setIO } from './io.js';
import { registerQueueSocket } from './queue.socket.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });
  setIO(io);

  // Login check: runs once when a client tries to connect
  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers.authorization || '';
      const token = socket.handshake.auth?.token || (header.startsWith('Bearer ') ? header.slice(7) : null);
      if (!token) return next(new Error('AUTH_REQUIRED'));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('role isActive');
      if (!user || !user.isActive) return next(new Error('AUTH_INVALID'));

      socket.data.user = { id: String(user._id), role: user.role };
      socket.data.exp = payload.exp;
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, role } = socket.data.user;

    socket.join(`user:${id}`);

    // Staff also join the rooms of the queues they are allowed to see
    try {
      if (role === ROLES.DOCTOR) {
        const doctor = await Doctor.findOne({ user: id }).select('_id');
        if (doctor) socket.join(`doctor:${doctor._id}`);
      } else if (role === ROLES.CLINIC) {
        const clinic = await Clinic.findOne({ owner: id }).select('_id');
        if (clinic) {
          socket.join(`clinic:${clinic._id}`);
          const doctors = await Doctor.find({ clinic: clinic._id }).select('_id');
          doctors.forEach((d) => socket.join(`doctor:${d._id}`));
        }
      }
    } catch (err) {
      logger.error(`Socket room join failed: ${err.message}`);
    }

    socket.emit('ready', { role, rooms: [...socket.rooms].filter((r) => r !== socket.id) });
    logger.info(`Socket connected: ${role} ${id}`);

    // The access token is short-lived, so the connection ends with it
    const msLeft = socket.data.exp * 1000 - Date.now();
    const timer = setTimeout(() => {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }, Math.max(msLeft, 0));

    socket.on('disconnect', () => clearTimeout(timer));
  });

  registerQueueSocket(io);
  return io;
};