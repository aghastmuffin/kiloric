/**
 * @deprecated Prefer swipe actions on Log (`logfood`). This card belonged to
 * the old Meals organiser screen.
 */
import React, { memo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { MealItemPreview } from '@/lib/mealItemPreview';
import type { MealType } from '@/lib/meals';

export type DisplayMealItem = MealItemPreview & {
  key: string;
  mealId: string;
  sourceType: MealType;
};

export const FactRow = memo(function FactRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
      <Text style={styles.factValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
    </View>
  );
});

export type DraggableItemCardProps = {
  item: DisplayMealItem;
  isLoadingItems: boolean;
  onDragStart: (item: DisplayMealItem) => void;
  onDragMove: (targetType: MealType | null) => void;
  onDragEnd: (item: DisplayMealItem, targetType: MealType | null) => void;
  findDropTarget: (x: number, y: number) => MealType | null;
};

export const DraggableItemCard = memo(function DraggableItemCard({
  item,
  isLoadingItems,
  onDragStart,
  onDragMove,
  onDragEnd,
  findDropTarget,
}: DraggableItemCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);

  // Always-current ref for closures
  const cbRef = useRef({ onDragStart, onDragMove, onDragEnd, findDropTarget, item });
  cbRef.current = { onDragStart, onDragMove, onDragEnd, findDropTarget, item };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
        
        Animated.spring(scale, {
          toValue: 1.05,
          friction: 5,
          useNativeDriver: false
        }).start();

        cbRef.current.onDragStart(cbRef.current.item);
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { 
          useNativeDriver: false,
          listener: (e, gs) => {
             const target = cbRef.current.findDropTarget(gs.moveX, gs.moveY);
             cbRef.current.onDragMove(target);
          }
        },
      ),

      onPanResponderRelease: (_e, gs) => {
        const target = cbRef.current.findDropTarget(gs.moveX, gs.moveY);
        const currentItem = cbRef.current.item;
        const isValidDrop = target !== null && target !== currentItem.sourceType;

        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: false,
        }).start();

        if (isValidDrop) {
          pan.setValue({ x: 0, y: 0 });
          setIsDragging(false);
          cbRef.current.onDragEnd(currentItem, target);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
            tension: 40,
          }).start(() => {
            setIsDragging(false);
            cbRef.current.onDragEnd(currentItem, null);
          });
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }).start();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start(() => setIsDragging(false));
      },

      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const hasFacts = item.facts.length > 0;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        isDragging && {
          zIndex: 100,
          elevation: 12,
          opacity: 0.95,
          borderColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>
      </View>

      <View style={styles.factsContainer}>
        {hasFacts ? (
          item.facts.map((fact) => (
            <FactRow key={`${item.key}-${fact.label}`} label={fact.label} value={fact.value} />
          ))
        ) : isLoadingItems ? (
          <View style={styles.fallbackBarcodeContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.fallbackBarcodeText}>Loading product…</Text>
          </View>
        ) : (
          <View style={styles.fallbackBarcodeContainer}>
            <Ionicons name="barcode-outline" size={16} color={colors.textMuted} />
            <Text style={styles.fallbackBarcodeText}>Barcode: {item.barcode}</Text>
          </View>
        )}
      </View>

      <View
        {...panResponder.panHandlers}
        style={styles.dragHandle}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="reorder-two-outline" size={24} color={colors.textMuted} />
      </View>
    </Animated.View>
  );
});

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { gap: 2 },
  itemTitle: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  factsContainer: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  factLabel: { color: c.textMuted, fontSize: 14, flex: 1 },
  factValue: { color: c.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
  fallbackBarcodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  fallbackBarcodeText: { color: c.textMuted, fontSize: 14 },
  dragHandle: { alignItems: 'center', marginTop: -4 },
});
