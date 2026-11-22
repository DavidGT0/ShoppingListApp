import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: 15,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 15,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  actionTextDanger: {
    color: '#c0392b',
  },
});
