import { View } from 'react-native';
import { useColors } from '../../src/hooks/useTheme';

export default function LogRoute() {
  const colors = useColors();
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
