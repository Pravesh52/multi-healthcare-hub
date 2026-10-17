import { useContext } from 'react';
import { SocketContext } from '@/context/SocketContext.jsx';

export default function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}