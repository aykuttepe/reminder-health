import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export const StockThresholdSlider: React.FC<StockThresholdSliderProps> = ({
  value,
  onChange,
  language,
  onHaptic,
  quickOptions = [3, 5, 7, 10, 15, 20],
  min = 1,
  max = 30,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [textInputVal, setTextInputVal] = useState(String(value));
  const trackWidthRef = useRef(0);
  trackWidthRef.current = trackWidth;

  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync internal text input state when value changes externally
  useEffect(() => {
    setTextInputVal(String(value));
  }, [value]);

  const updateFromPosition = (x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const clampedX = Math.max(0, Math.min(width, x));
    const ratio = clampedX / width;
    const newVal = Math.round(min + ratio * (max - min));
    const clampedVal = Math.max(min, Math.min(max, newVal));

    if (clampedVal !== valueRef.current) {
      onChange(clampedVal);
      onHaptic?.();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // locationX in Grant + dx gives reliable drag across track
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleTextChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setTextInputVal(digitsOnly);

    if (digitsOnly.length > 0) {
      const num = parseInt(digitsOnly, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(min, Math.min(max, num));
        onChange(clamped);
      }
    }
  };

  const handleTextBlur = () => {
    const num = parseInt(textInputVal, 10);
    if (isNaN(num) || num < min) {
      setTextInputVal(String(min));
      onChange(min);
    } else if (num > max) {
      setTextInputVal(String(max));
      onChange(max);
    } else {
      setTextInputVal(String(num));
      onChange(num);
    }
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
            <Ionicons name="remove" size={16} color={value <= min ? '#4b5563' : '#a9dfca'} />
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
            <Ionicons name="add" size={16} color={value >= max ? '#4b5563' : '#a9dfca'} />
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
          <View style={styles.trackBase} />

          {/* Active Filled Track */}
          <View
            style={[
              styles.trackActive,
              { width: `${ratio * 100}%` },
            ]}
          />

          {/* Interactive Thumb */}
          {trackWidth > 0 && (
            <View
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
    color: '#8e9aa8',
    lineHeight: 16,
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputWrapper: {
    backgroundColor: '#0c1926',
    borderWidth: 1.5,
    borderColor: '#22364c',
    borderRadius: 9,
    paddingHorizontal: 8,
    height: 38,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    color: '#a9dfca',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#162838',
    borderWidth: 1,
    borderColor: '#243b50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
    borderColor: '#192533',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
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
    backgroundColor: '#182838',
    borderRadius: 4,
    width: '100%',
  },
  trackActive: {
    height: 8,
    backgroundColor: '#a9dfca',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#a9dfca',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#081624',
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
    backgroundColor: '#081624',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  scaleText: {
    fontSize: 11,
    color: '#64748b',
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
    backgroundColor: '#132130',
    borderWidth: 1,
    borderColor: '#203244',
  },
  chipActive: {
    backgroundColor: '#163832',
    borderColor: '#a9dfca',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e9aa8',
  },
  chipTextActive: {
    color: '#a9dfca',
  },
});
