// src/lib/logger.ts
// Logger estruturado simples para a aplicação

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌'
};

// Nível mínimo de log (configurável por env)
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const LEVELS_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function shouldLog(level: LogLevel): boolean {
  return LEVELS_ORDER.indexOf(level) >= LEVELS_ORDER.indexOf(MIN_LEVEL);
}

function formatMessage(level: LogLevel, module: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const prefix = `${LOG_COLORS[level]} [${timestamp}] [${module}]`;

  if (data !== undefined) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 0).substring(0, 500) : String(data);
    return `${prefix} ${message} | ${dataStr}`;
  }

  return `${prefix} ${message}`;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(message: string, data?: any) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', this.module, message, data));
    }
  }

  info(message: string, data?: any) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', this.module, message, data));
    }
  }

  warn(message: string, data?: any) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', this.module, message, data));
    }
  }

  error(message: string, data?: any) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', this.module, message, data));
    }
  }

  // Helper para medir tempo de execução
  startTimer(label: string): () => number {
    const start = Date.now();
    return () => {
      const elapsed = Date.now() - start;
      this.info(`${label} concluído em ${elapsed}ms`);
      return elapsed;
    };
  }
}

export function createLogger(module: string): Logger {
  return new Logger(module);
}

export default createLogger;
