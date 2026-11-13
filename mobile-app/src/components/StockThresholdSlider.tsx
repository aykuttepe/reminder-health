import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, RADII } from '../theme';
export interface StockThresholdSliderProps {
  value: number;
  onChange: (newValue: number) => void;
  language: 'tr' | 'en';
  onHaptic?: () => void;
  quickOptions?: number[];
  min?: number;
  max?: number;
}

const THUMB_SIZE = 24;

export const STOCK_THRESHOLD_MIN = 1;
export const STOCK_THRESHOLD_MAX = 30;
export const STOCK_THRESHOLD_QUICK_OPTIONS = [3, 5, 7, 10, 15, 20];

export const StockThresholdSlider: React.FC<StockThresholdSliderProps> = ({
  value,
  onChange,
  language,
  onHaptic,
  quickOptions = STOCK_THRESHOLD_QUICK_OPTIONS,
  min = STOCK_THRESHOLD_MIN,
  max = STOCK_THRESHOLD_MAX,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [textInputVal, setTextInputVal] = useState(String(value));
  const trackWidthRef = useRef(0);
  trackWidthRef.current = trackWidth;

  // PanResponder is created once; it must read the latest props through a ref
  // instead of capturing the first render's min/max/callbacks.
  const latest = useRef({ value, min, max, onChange, onHaptic });
  latest.current = { value, min, max, onChange, onHaptic };

  // Sync internal text input state when value changes externally
  useEffect(() => {
    setTextInputVal(String(value));
  }, [value]);

  const updateFromPosition = (x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const { min: lo, max: hi, value: current, onChange: emit, onHaptic: haptic } = latest.current;
    const ratio = Math.max(0, Math.min(width, x)) / width;
    const next = Math.max(lo, Math.min(hi, Math.round(lo + ratio * (hi - lo))));

    if (next !== current) {
      emit(next);
      haptic?.();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the drag even if the surrounding settings ScrollView wants the gesture.
      onPanResponderTerminationRequest: () => false,
      // Track children use pointerEvents="none", so locationX is relative to the track itself.
      onPanResponderGrant: (evt: GestureResponderEvent) => updateFromPosition(evt.nativeEvent.locationX),
      onPanResponderMove: (evt: GestureResponderEvent) => updateFromPosition(evt.nativeEvent.locationX),
    })
  ).current;

  const handleTextChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setTextInputVal(digitsOnly);

    if (digitsOnly.length > 0) {
      const num = parseInt(digitsOnly, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(min, Math.min(max, num));
        // Show the value that is actually stored (e.g. 45 -> 30).
        if (clamped !== num) setTextInputVal(String(clamped));
        onChange(clamped);
      }
    }
  };

  const handleTextBlur = () => {
    // An empty field keeps the current threshold; typed values are already clamped.
    setTextInputVal(String(value));
  };

  const handleStep = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      onChange(next);
      onHaptic?.();
    }
  };

  // Safe progress percentage (0 to 1)
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <View style={styles.container}>
      {/* Top Header: Direct Manual Input & Steppers */}
      <View style={styles.headerRow}>
        <View style={styles.labelCol}>
          <Text style={styles.hintText}>
            {language === 'en'
              ? 'Enter manually or slide to adjust:'
              : 'Elle sayı girin veya kaydırarak ayarlayın:'}
          </Text>
        </View>

        <View style={styles.manualEntryRow}>
          {/* Minus Stepper */}
          <TouchableOpacity
            style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
            onPress={() => handleStep(-1)}
            disabled={value <= min}
            activeOpacity={0.7}
            accessibilityLabel={language === 'en' ? 'Decrease threshold' : 'Eşiği azalt'}
          >
            <Ionicons name="remove" size={16} color={value <= min ? COLORS.textMuted : COLORS.accent} />
          </TouchableOpacity>

          {/* Numeric Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={textInputVal}
              onChangeText={handleTextChange}
              onBlur={handleTextBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              accessibilityLabel={language === 'en' ? 'Stock threshold input' : 'Stok eşiği giriş alanı'}
            />
          </View>

          {/* Plus Stepper */}
          <TouchableOpacity
            style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
            onPress={() => handleStep(1)}
            disabled={value >= max}
            activeOpacity={0.7}
            accessibilityLabel={language === 'en' ? 'Increase threshold' : 'Eşiği artır'}
          >
            <Ionicons name="add" size={16} color={value >= max ? COLORS.textMuted : COLORS.accent} />
          </TouchableOpacity>

          <Text style={styles.unitText}>{language === 'en' ? 'Doses' : 'Doz'}</Text>
        </View>
      </View>

      {/* Interactive Slider Track */}
      <View style={styles.sliderSection}>
        <View
          style={styles.trackContainer}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          {/* Base Unfilled Track */}
          <View pointerEvents="none" style={styles.trackBase} />

          {/* Active Filled Track */}
          <View
            pointerEvents="none"
            style={[
              styles.trackActive,
              { width: `${ratio * 100}%` },
            ]}
          />

          {/* Interactive Thumb */}
          {trackWidth > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  left: Math.max(0, Math.min(trackWidth - THUMB_SIZE, ratio * trackWidth - THUMB_SIZE / 2)),
                },
              ]}
            >
              <View style={styles.thumbCenterDot} />
            </View>
          )}
        </View>

        {/* Min / Mid / Max Indicators */}
        <View style={styles.scaleRow}>
          <Text style={styles.scaleText}>{min}</Text>
          <Text style={styles.scaleText}>{Math.round((min + max) / 2)}</Text>
          <Text style={styles.scaleText}>{max}</Text>
        </View>
      </View>

      {/* Quick Option Chips */}
      {quickOptions && quickOptions.length > 0 && (
        <View style={styles.chipRow}>
          {quickOptions.map((opt) => {
            const isActive = value === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  onChange(opt);
                  onHaptic?.();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {opt} {language === 'en' ? 'd' : 'doz'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelCol: {
    flex: 1,
    paddingRight: 8,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 8,
    height: 38,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    color: COLORS.accent,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.button,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
    borderColor: COLORS.border,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  sliderSection: {
    paddingVertical: 8,
  },
  trackContainer: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBase: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    width: '100%',
  },
  trackActive: {
    height: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bg,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  scaleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
});
