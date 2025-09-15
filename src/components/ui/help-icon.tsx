import React from 'react';
import { HelpCircle } from 'lucide-react';

type HelpIconProps = {
  className?: string;
  'aria-label'?: string;
};

export function HelpIcon({ className = 'h-5 w-5', ...rest }: HelpIconProps) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} {...rest}>
      <HelpCircle className="h-full w-full text-muted-foreground" />
    </span>
  );
}

export default HelpIcon;
