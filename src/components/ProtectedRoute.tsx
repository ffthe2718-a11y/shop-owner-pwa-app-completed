import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Store } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const localAuth = localStorage.getItem('nexora_auth_active') === 'true';

        if (isMounted) {
          if (session || localAuth) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.warn('Error verifying Supabase auth session:', err);
        if (isMounted) {
          const localAuth = localStorage.getItem('nexora_auth_active') === 'true';
          setIsAuthenticated(localAuth);
        }
      }
    }

    checkAuth();

    // Listen for real-time auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        if (session) {
          localStorage.setItem('nexora_auth_active', 'true');
          setIsAuthenticated(true);
        } else {
          const localAuth = localStorage.getItem('nexora_auth_active') === 'true';
          setIsAuthenticated(localAuth);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show loading indicator while session state is being determined
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 animate-pulse">
            <Store className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
