import { View, Text } from 'react-native';
import { useColors } from '../../src/hooks/useTheme';

export default function LogRoute() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.t3, fontSize: 16 }}>Opening logger...</Text>
    </View>
  );
}
