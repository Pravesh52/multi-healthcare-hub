let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

// Sends an event to every open tab/device of one user
export const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};