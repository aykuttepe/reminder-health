import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { getTranslations, STORAGE_KEY_LANGUAGE, type Language } from '../i18n/translations';

import { COLORS, RADII } from '../theme';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  language: Language;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    language: 'tr',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // This screen sits outside the app, so it reads the saved language itself.
    AsyncStorage.getItem(STORAGE_KEY_LANGUAGE)
      .then(saved => { if (saved === 'en') this.setState({ language: 'en' }); })
      .catch(readError => logger.warn('ErrorBoundary', 'Dil ayarı okunamadı', { error: String(readError) }));
    logger.fatal('ErrorBoundary', `Arayüz Çökmesi: ${error.message}`, error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleShareReport = async () => {
    const { error, errorInfo } = this.state;
    const report = [
      '=== REMINDER HEALTH HATA RAPORU ===',
      `Tarih: ${new Date().toLocaleString('tr-TR')}`,
      `Hata: ${error?.message || 'Bilinmeyen hata'}`,
      `Stack:\n${error?.stack || 'Yok'}`,
      `Bileşen Ağacı:\n${errorInfo?.componentStack || 'Yok'}`,
      '\n--- Son Ayak İzi (Breadcrumbs) ---',
      logger.getBreadcrumbs().join('\n'),
    ].join('\n\n');

    try {
      await Share.share({
        title: 'Reminder Health Hata Raporu',
        message: report,
      });
    } catch {}
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const { error, language } = this.state;
      const t = getTranslations(language);
      return (
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
          </View>

          <Text style={styles.title}>{t.errorBoundaryTitle}</Text>
          <Text style={styles.subtitle}>{t.errorBoundaryText}</Text>

          <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
            <Text style={styles.errorTitle}>{t.errorBoundaryDetail}</Text>
            <Text style={styles.errorText}>{error?.message || t.errorBoundaryNoDetail}</Text>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={this.handleRestart} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.onAccent} />
              <Text style={styles.primaryBtnText}>{t.errorBoundaryRetry}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={this.handleShareReport} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={COLORS.accent} />
              <Text style={styles.secondaryBtnText}>{t.errorBoundaryShare}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  errorBoxContent: {
    padding: 12,
  },
  errorTitle: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: RADII.button,
  },
  primaryBtnText: {
    color: COLORS.onAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingVertical: 14,
    borderRadius: RADII.button,
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
