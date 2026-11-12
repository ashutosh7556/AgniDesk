import { BrowserRouter } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { PwaProvider } from './pwa/PwaContext.jsx';
import PwaBanners from './pwa/PwaBanners.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <PwaProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <PwaBanners />
      </ToastProvider>
      </PwaProvider>
    </BrowserRouter>
  );
}
