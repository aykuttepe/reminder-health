import React, { Component, ErrorInfo, ReactNode } from 'react';
import { webLogger } from '../logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WebErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    webLogger.fatal('WebErrorBoundary', `React Çökmesi: ${error.message}`, error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleCopy = () => {
    const text = webLogger.exportLogsAsText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Hata günlüğü panoya kopyalandı.');
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 20px',
          background: '#081624',
          color: '#f5f3f0',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#281a17',
            border: '1px solid #5c3325',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Beklenmeyen Bir Hata Oluştu</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', maxWidth: '320px', lineHeight: '1.5' }}>
            Arayüzde beklenmeyen bir problem meydana geldi. Verileriniz tarayıcınızda güvende saklandı.
          </p>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            background: '#0f1d2c',
            border: '1px solid #1e384f',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '11.5px',
            color: '#f87171',
            fontFamily: 'monospace',
            maxHeight: '100px',
            overflowY: 'auto'
          }}>
            {this.state.error?.message || 'Bilinmeyen Hata'}
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '340px' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--mint, #a9dfca)',
                color: '#081624',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Yeniden Yükle
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              style={{
                flex: 1,
                padding: '12px',
                background: '#122435',
                color: 'var(--mint, #a9dfca)',
                border: '1px solid #224666',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Logları Kopyala
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
