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
});
