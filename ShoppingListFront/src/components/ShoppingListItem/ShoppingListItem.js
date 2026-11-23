import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { styles } from './ShoppingListItem.styles';
import { colors } from '../../theme/colors';

const ShoppingListItem = ({
  item,
  onTogglePurchased,
  onEdit,
  onDelete,
  onUpdateAmount,
  onDrag,
  isActive,
  showAddedBy = false,
  currentUsername = null,
  disabled = false,
}) => {
  const swipeableRef = useRef(null);
  const cardScale = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(item.purchased ? 1 : 0)).current;
  const [nameWidth, setNameWidth] = useState(0);

  useEffect(() => {
    Animated.timing(lineAnim, {
      toValue: item.purchased ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [item.purchased, lineAnim]);

  // "נוסף ע״י" רק ברשימה משותפת ורק למוצר של מישהו אחר
  const showAdder =
    showAddedBy &&
    !!item.added_by &&
    item.added_by.trim() !== (currentUsername || '').trim();

  const handleCardPressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const strikeWidth = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, nameWidth],
  });

  const renderLeftActions = () => {
    return (
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionPurchase]}
        accessibilityRole="button"
        accessibilityLabel={
          item.purchased ? `החזר ${item.name} לרשימה` : `סמן ${item.name} כנקנה`
        }
        accessibilityState={{ disabled }}
        onPress={() => {
          swipeableRef.current?.close();
          onTogglePurchased();
        }}
      >
        <Icon name={item.purchased ? 'undo' : 'check'} size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionDelete]}
        accessibilityRole="button"
        accessibilityLabel={`מחק את ${item.name}`}
        accessibilityState={{ disabled }}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Icon name="trash-can-outline" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const handleSwipeableOpen = direction => {
    swipeableRef.current?.close();

    if (direction === 'left') {
      onTogglePurchased();
    } else if (direction === 'right') {
      onDelete();
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderRightActions}
      renderRightActions={renderLeftActions}
      onSwipeableWillOpen={handleSwipeableOpen}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      enabled={!isActive && !disabled}
    >
      <Pressable
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        accessible={false}
        accessibilityRole="none"
      >
        <Animated.View
          style={[
            styles.container,
            item.purchased && styles.purchasedContainer,
            isActive && styles.activeItem,
            { transform: [{ scale: cardScale }] },
          ]}
        >
          {item.categoryColor && (
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: item.categoryColor },
              ]}
            />
          )}

          {onDrag && (
            <GHTouchableOpacity
              onLongPress={onDrag}
              disabled={isActive}
              delayLongPress={150}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.dragHandle}
              accessibilityRole="button"
              accessibilityLabel="גרור לסידור מחדש"
              accessibilityState={{ disabled: disabled || !!isActive }}
            >
              <Icon
                name="drag-vertical"
                size={20}
                color={colors.text.secondary}
                style={{ opacity: 0.5 }}
              />
            </GHTouchableOpacity>
          )}

          <View
            style={styles.nameContainer}
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={`סמן ${item.name} כנקנה`}
            accessibilityState={{ checked: !!item.purchased, disabled }}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={() => {
              if (!disabled) onTogglePurchased();
            }}
          >
            <View
              onLayout={e => setNameWidth(e.nativeEvent.layout.width)}
              style={styles.nameInner}
            >
              {/* --- משימה 3: הוסר ה-numberOfLines כדי לאפשר לטקסט לגלוש ולייצג את השם המלא --- */}
              <Text
                style={[
                  styles.itemName,
                  item.purchased && styles.purchasedTextColor,
                ]}
              >
                {item.name}
              </Text>
              <Animated.View
                style={[styles.strikeLine, { width: strikeWidth }]}
              />
            </View>
            {!!item.note && (
              <Text
                testID="item_note"
                numberOfLines={2}
                style={styles.itemMeta}
              >
                {item.note}
              </Text>
            )}
            {showAdder && (
              <Text
                testID="item_added_by"
                numberOfLines={1}
                style={styles.itemMeta}
              >
                {'נוסף ע״י '}
                {item.added_by}
              </Text>
            )}
          </View>

          <View
            style={[styles.amountContainer, disabled && styles.amountDisabled]}
          >
            <Pressable
              style={styles.amountButton}
              android_ripple={{
                color: colors.borderLight,
                radius: 16,
                borderless: true,
              }}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="הפחת כמות"
              accessibilityState={{ disabled }}
              onPress={() => onUpdateAmount(Math.max(1, item.amount - 1))}
            >
              <Icon name="minus" size={16} color={colors.primary} />
            </Pressable>
            <Text testID="item_amount" style={styles.amountText}>
              {item.unit ? `${item.amount} ${item.unit}` : String(item.amount)}
            </Text>
            <Pressable
              style={styles.amountButton}
              android_ripple={{
                color: colors.borderLight,
                radius: 16,
                borderless: true,
              }}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="הוסף כמות"
              accessibilityState={{ disabled }}
              onPress={() => onUpdateAmount(item.amount + 1)}
            >
              <Icon name="plus" size={16} color={colors.primary} />
            </Pressable>
          </View>

          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`ערוך את ${item.name}`}
            style={styles.actionButton}
            android_ripple={{
              color: colors.borderLight,
              radius: 18,
              borderless: true,
            }}
          >
            <Icon
              name="pencil-outline"
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Swipeable>
  );
};

export default ShoppingListItem;
