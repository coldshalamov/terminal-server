import { useEffect } from 'react';
import { useTerminal } from '../hooks/useTerminal';

export interface TerminalProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  isActive: boolean;
  onMethodsReady?: (methods: any) => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  onData,
  onResize,
  isActive,
  onMethodsReady,
}) => {
  const [terminalRef, methods] = useTerminal({ onData, onResize, isActive });

  // Expose methods to parent component
  useEffect(() => {
    if (onMethodsReady) {
      onMethodsReady(methods);
    }
  }, [methods, onMethodsReady]);

  return <div ref={terminalRef} className="terminal-wrapper w-full h-full" />;
};
