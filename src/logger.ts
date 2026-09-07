export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  timeStr: string;
  level: LogLevel;
  tag: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
  breadcrumbs?: string[];
}

const STORAGE_KEY_LOGS = 'reminder_health_error_logs_web_v1';
const MAX_LOGS = 100;
const MAX_BREADCRUMBS = 10;

class WebLogger {
  private logs: LogEntry[] = [];
  private breadcrumbs: string[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized) return;
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY_LOGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.logs = parsed.slice(-MAX_LOGS);
          }
        }
        this.setupGlobalErrorHandlers();
      }
      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('[WebLogger] Geçmiş loglar yüklenemedi:', err);
      this.isInitialized = true;
    }
  }

  public breadcrumb(action: string): void {
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.breadcrumbs.push(`[${time}] ${action}`);
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  public info(tag: string, message: string, details?: Record<string, unknown>): void {
    this.addLog('INFO', tag, message, undefined, details);
  }

  public warn(tag: string, message: string, details?: Record<string, unknown>): void {
    this.addLog('WARN', tag, message, undefined, details);
  }

  public error(tag: string, message: string, error?: unknown, details?: Record<string, unknown>): void {
    let stack: string | undefined;
    let extraMessage = message;

    if (error instanceof Error) {
      stack = error.stack;
      if (error.message && !message.includes(error.message)) {
        extraMessage = `${message} -> ${error.message}`;
      }
    } else if (typeof error === 'string') {
      stack = error;
    } else if (error && typeof error === 'object') {
      try {
        stack = JSON.stringify(error);
      } catch {}
    }

    this.addLog('ERROR', tag, extraMessage, stack, details);
  }

  public fatal(tag: string, message: string, error?: unknown, details?: Record<string, unknown>): void {
    let stack: string | undefined;
    if (error instanceof Error) {
      stack = error.stack;
    }
    this.addLog('FATAL', tag, message, stack, details);
  }

  private addLog(
    level: LogLevel,
    tag: string,
    message: string,
    stack?: string,
    details?: Record<string, unknown>
  ): void {
    const now = new Date();
    const entry: LogEntry = {
      id: `${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      timeStr: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      tag,
      message,
      stack,
      details,
      breadcrumbs: [...this.breadcrumbs],
    };

    const prefix = `[Reminder Health][${level}][${tag}]`;
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(prefix, message, stack || '', details || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, details || '');
    } else {
      console.log(prefix, message, details || '');
    }

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    } catch {}
  }

  public getLogs(): LogEntry[] {
    return [...this.logs].reverse();
  }

  public getBreadcrumbs(): string[] {
    return [...this.breadcrumbs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.breadcrumbs = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_LOGS);
      } catch {}
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch {}
    });
  }

  public exportLogsAsText(): string {
    if (this.logs.length === 0) return 'Log kaydı bulunmuyor.';
    return this.logs
      .map(l => {
        const header = `[${l.timestamp}] [${l.level}] [${l.tag}]: ${l.message}`;
        const breadcrumbs = l.breadcrumbs && l.breadcrumbs.length > 0
          ? `\n  Ayak İzi:\n    ${l.breadcrumbs.join('\n    ')}`
          : '';
        const details = l.details ? `\n  Detaylar: ${JSON.stringify(l.details)}` : '';
        const stack = l.stack ? `\n  Stack:\n${l.stack}` : '';
        return `${header}${breadcrumbs}${details}${stack}\n`;
      })
      .join('\n----------------------------------------\n');
  }

  public exportLogsAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.fatal('WindowError', event.message || 'Bilinmeyen Tarayıcı Hatası', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('UnhandledPromise', 'İşlenmemiş Promise Hatası', event.reason);
    });
  }
}

export const webLogger = new WebLogger();
