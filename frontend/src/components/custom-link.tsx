import { ReactNode } from 'react';
import { Link as WouterLink } from 'wouter';

type CustomLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Custom Link component that wraps wouter's Link component
 * with automatic scroll-to-top behavior
 */
export default function Link({ href, children, className, onClick }: CustomLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If provided, run the original onClick handler
    if (onClick) {
      onClick(e);
    }

    // If the event wasn't prevented by the onClick handler, 
    // scroll to top after navigation
    if (!e.defaultPrevented) {
      window.scrollTo(0, 0);
    }
  };

  return (
    <WouterLink href={href} onClick={handleClick} className={className}>
      {children}
    </WouterLink>
  );
}