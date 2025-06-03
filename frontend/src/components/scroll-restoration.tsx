import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * ScrollRestoration component automatically scrolls to top when navigating to a new page
 * This component should be placed high in the component tree (like in App.tsx)
 */
export default function ScrollRestoration() {
  const [location] = useLocation();
  
  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}