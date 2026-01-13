import { forwardRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ThemeToggle = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
  function ThemeToggle(props, ref) {
    const { theme, toggleTheme } = useTheme();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            ref={ref}
            variant="outline" 
            size="icon" 
            onClick={toggleTheme}
            className="border-border"
            {...props}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);