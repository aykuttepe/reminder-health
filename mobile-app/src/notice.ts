import { Alert } from 'react-native';
import { getTranslations, type Language } from './i18n/translations';

/**
 * One-button information alert. A bare Alert.alert(title, message) shows the platform's
 * untranslated "OK", so every notice goes through here with a localized button.
 */
export function showNotice(title: string, message: string, lang: Language): void {
  Alert.alert(title, message, [{ text: getTranslations(lang).ok }]);
}
