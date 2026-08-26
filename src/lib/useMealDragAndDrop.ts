/**
 * @deprecated Prefer swipe-to-move on Log (`logfood`). This drag-and-drop
 * helper belonged to the old Meals organiser screen.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { LayoutAnimation, View } from 'react-native';
import { fetchMealItemPreview, type MealItemPreview } from '@/lib/mealItemPreview';
import { moveProductBetweenMeals, type MealDocument, type MealType, MEAL_TYPE_OPTIONS } from '@/lib/meals';
import type { DisplayMealItem } from '@/components/DraggableItemCard';

export type DisplayMealSection = {
  type: MealType;
  friendlyname: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: DisplayMealItem[];
};

const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function useMealDragAndDrop(
  displayedMeals: MealDocument[],
  setAllMeals: React.Dispatch<React.SetStateAction<MealDocument[]>>,
  userId: string | undefined,
  showToast?: (msg: string) => void,
  onMealsChanged?: () => void
) {
  const [itemPreviews, setItemPreviews] = useState<Record<string, MealItemPreview>>({});
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [dragState, setDragState] = useState<{ activeItem: DisplayMealItem | null; targetZone: MealType | null }>({
    activeItem: null,
    targetZone: null,
  });

  const dropZones = useRef<Map<MealType, { x: number; y: number; width: number; height: number }>>(new Map()).current;
  const zoneRefs = useRef<Record<string, View | null>>({});

  useEffect(() => {
    let cancelled = false;

    const loadItemPreviews = async () => {
      const entries: { cacheKey: string; barcode: string; type: MealType }[] = [];

      for (const meal of displayedMeals) {
        for (const [index, barcode] of (meal.items ?? []).entries()) {
          entries.push({
            cacheKey: `${meal.$id}-${index}-${barcode}`,
            barcode,
            type: (meal.type ?? 'Other') as MealType,
          });
        }
      }

      if (entries.length === 0) {
        setItemPreviews({});
        return;
      }

      setIsLoadingItems(true);
      try {
        const previews = await Promise.all(
          entries.map(async ({ cacheKey, barcode, type }) => {
            const preview = await fetchMealItemPreview(barcode, type);
            return [cacheKey, preview] as const;
          }),
        );

        if (!cancelled) {
          setItemPreviews(Object.fromEntries(previews));
        }
      } catch (error) {
        console.warn('Failed to load meal item previews', error);
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    };

    void loadItemPreviews();
    return () => { cancelled = true; };
  }, [displayedMeals]);

  const sections = useMemo<DisplayMealSection[]>(() => {
    return MEAL_TYPE_OPTIONS.map((type) => {
      const mealsForType = displayedMeals.filter((meal) => meal.type === type);
      const friendlyname = mealsForType[0]?.friendlyname || type;

      const totals = mealsForType.reduce((acc, meal) => ({
        kcal: acc.kcal + (meal.kcal || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

      const items: DisplayMealItem[] = [];
      for (const meal of mealsForType) {
        for (const [index, barcode] of (meal.items ?? []).entries()) {
          const cacheKey = `${meal.$id}-${index}-${barcode}`;
          const preview = itemPreviews[cacheKey] ?? {
            barcode,
            title: `Barcode: ${barcode}`,
            facts: [],
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
          };

          items.push({
            ...preview,
            key: cacheKey,
            mealId: meal.$id,
            sourceType: type,
          });
        }
      }

      return { type, friendlyname, ...totals, items };
    });
  }, [displayedMeals, itemPreviews]);

  const handleItemDropped = useCallback(async (item: DisplayMealItem, targetType: MealType) => {
    if (!userId || item.sourceType === targetType) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);

    setAllMeals((prev) => {
      const next: MealDocument[] = prev.map((meal) => ({
        ...meal,
        items: [...(meal.items ?? [])],
      }));
      const sourceMeal = next.find((meal) => meal.$id === item.mealId);
      if (!sourceMeal?.items) return prev;

      const dayStart = getStartOfDay(new Date(sourceMeal.$createdAt)).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const barcodeIndex = sourceMeal.items.indexOf(item.barcode);
      if (barcodeIndex === -1) return prev;

      sourceMeal.items.splice(barcodeIndex, 1);
      sourceMeal.kcal = Math.max(0, (sourceMeal.kcal ?? 0) - (item.kcal ?? 0));
      sourceMeal.protein = Math.max(0, (sourceMeal.protein ?? 0) - (item.protein ?? 0));
      sourceMeal.carbs = Math.max(0, (sourceMeal.carbs ?? 0) - (item.carbs ?? 0));
      sourceMeal.fat = Math.max(0, (sourceMeal.fat ?? 0) - (item.fat ?? 0));

      if (sourceMeal.items.length === 0) {
        const sourceIndex = next.findIndex((meal) => meal.$id === sourceMeal.$id);
        if (sourceIndex !== -1) next.splice(sourceIndex, 1);
      }

      const targetMeal = next.find((meal) => {
        if (meal.type !== targetType) return false;
        const ts = new Date(meal.$createdAt).getTime();
        return ts >= dayStart && ts < dayEnd;
      });
      if (targetMeal) {
        targetMeal.items = [...(targetMeal.items ?? []), item.barcode];
        targetMeal.kcal = (targetMeal.kcal ?? 0) + (item.kcal ?? 0);
        targetMeal.protein = (targetMeal.protein ?? 0) + (item.protein ?? 0);
        targetMeal.carbs = (targetMeal.carbs ?? 0) + (item.carbs ?? 0);
        targetMeal.fat = (targetMeal.fat ?? 0) + (item.fat ?? 0);
        targetMeal.type = targetType;
        targetMeal.friendlyname = targetType;
      } else {
        next.push({
          $id: `optimistic-${item.barcode}-${Date.now()}`,
          $sequence: '0',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          $databaseId: '',
          $collectionId: '',
          owner: userId,
          friendlyname: targetType,
          type: targetType,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          items: [item.barcode],
        });
      }

      return next;
    });

    if (showToast) showToast(`Moved to ${targetType}`);

    try {
      await moveProductBetweenMeals(
        userId,
        item.mealId,
        item.barcode,
        targetType,
        {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
      );
      if (onMealsChanged) onMealsChanged();
    } catch (err) {
      console.warn('Failed to move item between meals', err);
      if (onMealsChanged) onMealsChanged();
    }
  }, [userId, showToast, setAllMeals, onMealsChanged]);

  const measureZone = useCallback((type: MealType) => {
    const ref = zoneRefs.current[type];
    if (!ref) return;
    ref.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        dropZones.set(type, { x, y, width, height });
      }
    });
  }, [dropZones]);

  const findDropTarget = useCallback((dropX: number, dropY: number): MealType | null => {
    for (const [type, zone] of dropZones.entries()) {
      if (
        dropX >= zone.x && dropX <= zone.x + zone.width &&
        dropY >= zone.y && dropY <= zone.y + zone.height
      ) {
        return type;
      }
    }
    return null;
  }, [dropZones]);

  const handleDragStart = useCallback((item: DisplayMealItem) => {
    setScrollEnabled(false);
    setDragState({ activeItem: item, targetZone: null });
    MEAL_TYPE_OPTIONS.forEach((type) => measureZone(type));
  }, [measureZone]);

  const handleDragMove = useCallback((target: MealType | null) => {
    setDragState(prev => {
      if (prev.targetZone !== target) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        return { ...prev, targetZone: target };
      }
      return prev;
    });
  }, []);

  const handleDragEnd = useCallback((item: DisplayMealItem, target: MealType | null) => {
    setScrollEnabled(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setDragState({ activeItem: null, targetZone: null });

    if (target !== null && target !== item.sourceType) {
      void handleItemDropped(item, target);
    }
  }, [handleItemDropped]);

  return {
    sections,
    isLoadingItems,
    scrollEnabled,
    dragState,
    zoneRefs,
    measureZone,
    findDropTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
