import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADII } from '../theme';

/** Same proportions as scripts/render-icons.swift so the header logo matches the launcher icon. */
const MARK_SCALE = 0.6;
const GAP_RATIO = 0.105;
const INNER_RADIUS_RATIO = 0.11;

interface BrandMarkProps {
  size: number;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';
// Inner (centre-facing) corner of each petal, row by row.
const PETAL_ROWS: Corner[][] = [['br', 'bl'], ['tr', 'tl']];

/** Four-petal Rutin mark on a terracotta tile. */
export const BrandMark: React.FC<BrandMarkProps> = ({ size }) => {
  const width = size * MARK_SCALE;
  const petal = width / (2 + GAP_RATIO);
  const gap = petal * GAP_RATIO;
  const outer = petal / 2;
  const inner = petal * INNER_RADIUS_RATIO;

  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      {/* Explicit rows instead of flexWrap: fractional sizes could wrap the second petal early. */}
      <View style={{ gap }}>
        {PETAL_ROWS.map((row) => (
          <View key={row.join('')} style={{ flexDirection: 'row', gap }}>
            {row.map((innerCorner) => (
              <View
                key={innerCorner}
                style={{
                  width: petal,
                  height: petal,
                  backgroundColor: COLORS.bg,
                  borderTopLeftRadius: innerCorner === 'tl' ? inner : outer,
                  borderTopRightRadius: innerCorner === 'tr' ? inner : outer,
                  borderBottomLeftRadius: innerCorner === 'bl' ? inner : outer,
                  borderBottomRightRadius: innerCorner === 'br' ? inner : outer,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: RADII.sm,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
