import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  href?: string;
}

export function AppLogo({ className, iconSize = 24, textSize = "text-xl", href = "/" }: AppLogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-headline font-semibold text-foreground hover:text-primary transition-colors", className)}>
      <Building2 size={iconSize} className="text-primary" />
      <span className={cn(textSize)}>{'D-TERRITORIO'}</span>
    </Link>
  );
}
