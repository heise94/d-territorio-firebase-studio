
import Image from 'next/image';
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
    <Link href={href} className={cn("flex items-center gap-2 font-headline font-semibold text-primary hover:text-primary/90 transition-colors", className)}>
      <Image 
        src="/logo.png" 
        alt="D-TERRITORIO Logo" 
        width={iconSize} 
        height={iconSize} 
        className="object-contain"
      />
      <span className={cn(textSize, 'text-emerald-500')}>D-TERRITORIO</span>
    </Link>
  );
}
