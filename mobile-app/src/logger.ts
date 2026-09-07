import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY_LOGS = 'reminder_health_error_logs_v1';
const MAX_LOGS = 100;
const MAX_BREADCRUMBS = 10;

class AppLogger {
  private logs: LogEntry[] = [];
  private breadcrumbs: string[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Asenkron depolamadan geçmiş logları yükler ve dinleyicileri bağlar.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_LOGS);
        }
      }
      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('[Logger] Geçmiş loglar yüklenemedi:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Kullanıcı veya sistem eylemlerini ayak izi (breadcrumb) olarak kaydeder.
   */
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

    // Konsola da yaz
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

    this.scheduleSave();
    this.notifyListeners();
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
      } catch (err) {
        console.warn('[Logger] Loglar diske yazılamadı:', err);
      }
    }, 1000);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs].reverse(); // En güncel en üstte
  }

  public getBreadcrumbs(): string[] {
    return [...this.breadcrumbs];
  }

  public async clearLogs(): Promise<void> {
    this.logs = [];
    this.breadcrumbs = [];
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_LOGS);
    } catch {}
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

  /**
   * React Native ErrorUtils ve Promise unhandled yakalayıcılarını kurar.
   */
  public setupGlobalErrorHandlers(): void {
    // 1. React Native ErrorUtils Global Handler
    const globalAny = globalThis as unknown as {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      };
    };

    if (globalAny.ErrorUtils && typeof globalAny.ErrorUtils.setGlobalHandler === 'function') {
      const defaultHandler = globalAny.ErrorUtils.getGlobalHandler?.();
      globalAny.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        this.fatal('GlobalJS', isFatal ? 'Kritik JS Hatası (Fatal)' : 'Yakalanmamış JS Hatası', error, { isFatal });
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
      this.info('System', 'Global JS ErrorUtils yakalayıcısı bağlandı.');
    }
  }
}

export const logger = new AppLogger();
