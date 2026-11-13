import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, MIN_TOUCH, RADII, SPACING } from '../theme';
const ITEM_H = 52;
const VISIBLE = 5; // odd, so one row sits in the centre band
const PAD = ITEM_H * ((VISIBLE - 1) / 2);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** One scrollable, snapping column. The value under the centre band is the selection. */
function Wheel({ values, value, onChange }: { values: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, values.indexOf(value));
  const [centerIndex, setCenterIndex] = useState(initialIndex);

  useEffect(() => {
    // Jump to the current value once the list is laid out.
    const id = setTimeout(() => ref.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false }), 0);
    return () => clearTimeout(id);
  }, []);

  const clampIndex = (y: number) => Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_H)));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clampIndex(e.nativeEvent.contentOffset.y);
    if (i !== centerIndex) setCenterIndex(i);
  };

  const commit = (i: number) => {
    setCenterIndex(i);
    onChange(values[i]);
    ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
  };

  return (
    <View style={styles.wheel}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={e => commit(clampIndex(e.nativeEvent.contentOffset.y))}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map((v, i) => {
          const selected = i === centerIndex;
          return (
            <Pressable key={v} onPress={() => commit(i)} style={styles.item}>
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{pad2(v)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export interface TimePickerModalProps {
  visible: boolean;
  value: string;           // "HH:mm"
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  minuteStep?: number;     // default 1
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function TimePickerModal({
  visible, value, title, confirmLabel, cancelLabel, minuteStep = 1, onConfirm, onClose,
}: TimePickerModalProps) {
  const parsed = /^(\d{1,2}):(\d{1,2})$/.exec(value || '');
  const initHour = parsed ? Math.min(23, Number(parsed[1])) : 13;
  const initMinute = parsed ? Math.min(59, Number(parsed[2])) : 0;

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(minutes.reduce((a, b) => (Math.abs(b - initMinute) < Math.abs(a - initMinute) ? b : a), minutes[0]));

  // Re-seed when reopened for a different value.
  useEffect(() => {
    if (!visible) return;
    setHour(initHour);
    setMinute(minutes.reduce((a, b) => (Math.abs(b - initMinute) < Math.abs(a - initMinute) ? b : a), minutes[0]));
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Ionicons name="time-outline" size={18} color={COLORS.accent} />
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.preview}>{pad2(hour)}:{pad2(minute)}</Text>

          <View style={styles.wheels}>
            {/* Centre band that marks the selected row in both columns; drawn first so it sits behind the digits. */}
            <View pointerEvents="none" style={styles.centerBand} />
            <Wheel values={hours} value={hour} onChange={setHour} />
            <Text style={styles.colon}>:</Text>
            <Wheel values={minutes} value={minute} onChange={setMinute} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(`${pad2(hour)}:${pad2(minute)}`)} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={18} color={COLORS.onAccent} />
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: COLORS.surface, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  preview: { color: COLORS.accent, fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 6 },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ITEM_H * VISIBLE, position: 'relative' },
  wheel: { width: 96, height: ITEM_H * VISIBLE, overflow: 'hidden' },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 22, color: COLORS.textMuted, fontWeight: '500' },
  itemTextSelected: { fontSize: 30, color: COLORS.text, fontWeight: '800' },
  colon: { color: COLORS.accent, fontSize: 28, fontWeight: '800', marginHorizontal: 4 },
  centerBand: {
    position: 'absolute', left: 8, right: 8, top: PAD, height: ITEM_H,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.accentBorder, backgroundColor: COLORS.accentSoft, borderRadius: RADII.sm,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, height: MIN_TOUCH, borderRadius: RADII.button, borderWidth: 1, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1.4, height: MIN_TOUCH, borderRadius: RADII.button, backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmText: { color: COLORS.onAccent, fontSize: 15, fontWeight: '700' },
});
