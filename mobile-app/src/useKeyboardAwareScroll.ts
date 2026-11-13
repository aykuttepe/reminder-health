import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';

/** Space kept between the focused field and the top of the keyboard. */
const FIELD_KEYBOARD_GAP = 24;
/** Lets the padded ScrollView finish its layout before the focused field is measured. */
const SCROLL_AFTER_LAYOUT_MS = 60;

/**
 * Keeps the focused text field above the software keyboard inside a scrolling form.
 *
 * Form modals are separate Android windows and the app draws edge to edge, so the window is not
 * resized when the keyboard opens (adjustResize has no effect) and lower fields stayed hidden.
 * The returned bottom inset shrinks the form by the keyboard height and the field is then scrolled
 * into view. iOS uses ScrollView's automaticallyAdjustKeyboardInsets instead, so the inset is 0 there.
 */
export function useKeyboardAwareScroll(enabled = true) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  // Read the context directly: MainApp renders its own SafeAreaProvider, so it sits above any provider.
  const insets = useContext(SafeAreaInsetsContext);
  const safeBottom = insets?.bottom ?? initialWindowMetrics?.insets.bottom ?? 0;

  const revealFocusedField = useCallback((keyboardTop: number) => {
    const field = TextInput.State.currentlyFocusedInput();
    if (!field || !scrollRef.current) return;
    field.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + FIELD_KEYBOARD_GAP - keyboardTop;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollYRef.current + overlap, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) {
      setKeyboardInset(0);
      return undefined;
    }
    let pending: ReturnType<typeof setTimeout> | null = null;
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      // The safe-area view already pads the navigation bar, which the keyboard height includes.
      setKeyboardInset(Math.max(0, event.endCoordinates.height - safeBottom));
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => revealFocusedField(event.endCoordinates.screenY), SCROLL_AFTER_LAYOUT_MS);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));
    return () => {
      if (pending) clearTimeout(pending);
      show.remove();
      hide.remove();
    };
  }, [enabled, revealFocusedField, safeBottom]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollRef,
    /** Bottom padding for the view that holds the ScrollView. */
    keyboardInset,
    /** Spread onto the ScrollView. */
    scrollProps: {
      onScroll,
      scrollEventThrottle: 16,
      automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
    },
  };
}
