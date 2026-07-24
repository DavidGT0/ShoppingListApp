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
      enabled={!isActive}
    >
      <Pressable onPressIn={handleCardPressIn} onPressOut={handleCardPressOut}>
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

          <GHTouchableOpacity
            onLongPress={onDrag}
            disabled={isActive}
            delayLongPress={150}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.dragHandle}
          >
            <Icon
              name="drag-vertical"
              size={20}
              color={colors.text.secondary}
              style={{ opacity: 0.5 }}
            />
          </GHTouchableOpacity>

          <View style={styles.nameContainer}>
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
          </View>

          <View style={styles.amountContainer}>
            <Pressable
              style={styles.amountButton}
              android_ripple={{
                color: colors.borderLight,
                radius: 16,
                borderless: true,
              }}
              onPress={() => onUpdateAmount(Math.max(1, item.amount - 1))}
            >
              <Icon name="minus" size={16} color={colors.primary} />
            </Pressable>
            <Text style={styles.amountText}>{item.amount}</Text>
            <Pressable
              style={styles.amountButton}
              android_ripple={{
                color: colors.borderLight,
                radius: 16,
                borderless: true,
              }}
              onPress={() => onUpdateAmount(item.amount + 1)}
            >
              <Icon name="plus" size={16} color={colors.primary} />
            </Pressable>
          </View>

          <Pressable
            onPress={onEdit}
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
