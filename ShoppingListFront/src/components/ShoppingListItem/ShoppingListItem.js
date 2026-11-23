import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { makeStyles } from './ShoppingListItem.styles';
import { useStyles, useTheme } from '../../theme/ThemeContext';

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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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

  const strikeWidth = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, nameWidth],
  });

  const ripple = radius => ({
    color: colors.borderLight,
    radius,
    borderless: true,
  });

  // הפקדים שחייבים להציג את חסימת האופליין (עיגול, שם, פח) אינם מושבתים:
  // המסך מריץ blockIfOffline. רק כפתורי הכמות מושבתים בפועל.
  return (
    <View
      style={[
        styles.container,
        item.purchased && styles.purchasedContainer,
        isActive && styles.activeItem,
      ]}
    >
      {item.categoryColor && (
        <View
          style={[styles.categoryDot, { backgroundColor: item.categoryColor }]}
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
          accessibilityState={{ disabled: !!isActive }}
          accessibilityHint="לחיצה כפולה והחזקה כדי לגרור"
        >
          <Icon
            name="drag-vertical"
            size={20}
            color={colors.text.secondary}
            style={{ opacity: 0.5 }}
          />
        </GHTouchableOpacity>
      )}

      <Pressable
        testID={`item_check_${item.id}`}
        onPress={() => onTogglePurchased()}
        accessibilityRole="checkbox"
        accessibilityLabel={[
          item.name,
          item.note,
          showAdder ? `נוסף ע״י ${item.added_by}` : null,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityState={{ checked: !!item.purchased }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.checkCircle, item.purchased && styles.checkCircleDone]}
      >
        {item.purchased && (
          <Icon name="check" size={16} color={colors.navy} />
        )}
      </Pressable>

      <Pressable
        testID={`item_name_${item.id}`}
        onPress={() => onEdit()}
        accessibilityRole="button"
        accessibilityLabel={`ערוך את ${item.name}`}
        accessibilityHint="לחיצה לעריכה"
        style={styles.nameContainer}
      >
        <View
          onLayout={e => setNameWidth(e.nativeEvent.layout.width)}
          style={styles.nameInner}
        >
          <Text
            style={[
              styles.itemName,
              item.purchased && styles.purchasedTextColor,
            ]}
          >
            {item.name}
          </Text>
          <Animated.View style={[styles.strikeLine, { width: strikeWidth }]} />
        </View>
        {!!item.note && (
          <Text testID="item_note" numberOfLines={2} style={styles.itemMeta}>
            {item.note}
          </Text>
        )}
        {showAdder && (
          <Text testID="item_added_by" numberOfLines={1} style={styles.itemMeta}>
            {'נוסף ע״י '}
            {item.added_by}
          </Text>
        )}
      </Pressable>

      <View
        style={[styles.amountContainer, disabled && styles.amountDisabled]}
      >
        <Pressable
          style={styles.amountButton}
          android_ripple={ripple(16)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="הפחת כמות"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityState={{ disabled }}
          onPress={() => onUpdateAmount(Math.max(1, item.amount - 1))}
        >
          <Icon name="minus" size={16} color={colors.primaryText} />
        </Pressable>
        <Text testID="item_amount" style={styles.amountText}>
          {item.unit ? `${item.amount} ${item.unit}` : String(item.amount)}
        </Text>
        <Pressable
          style={styles.amountButton}
          android_ripple={ripple(16)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="הוסף כמות"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityState={{ disabled }}
          onPress={() => onUpdateAmount(item.amount + 1)}
        >
          <Icon name="plus" size={16} color={colors.primaryText} />
        </Pressable>
      </View>

      <Pressable
        testID={`item_delete_${item.id}`}
        onPress={() => onDelete()}
        accessibilityRole="button"
        accessibilityLabel={`מחק את ${item.name}`}
        style={styles.actionButton}
        android_ripple={ripple(18)}
      >
        <Icon name="trash-can-outline" size={20} color={colors.dangerText} />
      </Pressable>
    </View>
  );
};

export default ShoppingListItem;
