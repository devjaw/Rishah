import { useEffect } from 'react';

export function usePathRedirect(): void {
  useEffect(() => {
    if (window.location.pathname !== '/') return;
    window.location.replace('/com.rishah.app');
  }, []);
}
