import React from 'react';
import { HelpCircle } from 'lucide-react';

type HelpIconProps = {
  className?: string;
  'aria-label'?: string;
};

export function HelpIcon({ className = 'h-5 w-5', ...rest }: HelpIconProps) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-muted/50 p-1 ${className}`} {...rest}>
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

export default HelpIcon;
