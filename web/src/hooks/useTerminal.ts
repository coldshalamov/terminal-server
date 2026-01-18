import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export interface UseTerminalProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  isActive: boolean;
}

export interface TerminalMethods {
  write: (data: string | Uint8Array) => void;
  clear: () => void;
  fit: () => void;
  getTerminal: () => XTerm | null;
}

export const useTerminal = ({ onData, onResize }: UseTerminalProps): [React.RefObject<HTMLDivElement>, TerminalMethods] => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) {
      return;
    }

    // Initialize xterm.js
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", "Lucida Console", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send initial dimensions
    const { cols, rows } = terminal;
    onResize(cols, rows);

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        onResize(cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onResize]);

  // Handle terminal data input
  useEffect(() => {
    const terminal = xtermRef.current;
    if (!terminal) return;

    const handleData = (data: string) => {
      onData(data);
    };

    terminal.onData(handleData);

    return () => {
      terminal.onData(() => {});
    };
  }, [onData]);

  // Write data to terminal
  const write = useCallback((data: string | Uint8Array) => {
    if (xtermRef.current) {
      if (typeof data === 'string') {
        xtermRef.current.write(data);
      } else {
        xtermRef.current.write(new TextDecoder().decode(data));
      }
    }
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  // Fit terminal to container
  const fit = useCallback(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, []);

  // Get terminal instance
  const getTerminal = useCallback(() => xtermRef.current, []);

  const methods: TerminalMethods = {
    write,
    clear,
    fit,
    getTerminal,
  };

  return [terminalRef, methods];
};
