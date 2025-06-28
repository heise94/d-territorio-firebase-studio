
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  href?: string;
  isCollapsed?: boolean;
}

export function AppLogo({ className, iconSize = 24, textSize = "text-xl", href = "/", isCollapsed = false }: AppLogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-headline font-semibold text-primary hover:text-primary/90 transition-colors", isCollapsed && "justify-center", className)}>
      <Image 
        src="/logo.png" 
        alt="D-TERRITORIO Logo" 
        width={iconSize} 
        height={iconSize} 
        className="object-contain"
      />
      {!isCollapsed && <span className={cn(textSize, 'text-emerald-500 whitespace-nowrap')}>D-TERRITORIO</span>}
    </Link>
  );
}
