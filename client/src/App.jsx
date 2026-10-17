import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { SocketProvider } from '@/context/SocketContext.jsx';
import AppRoutes from '@/routes/AppRoutes.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--c-card))',
              color: 'rgb(var(--c-ink))',
              border: '1px solid rgb(var(--c-line))',
              maxWidth: '92vw',
            },
          }}
        />
      </SocketProvider>
    </AuthProvider>
  );
}