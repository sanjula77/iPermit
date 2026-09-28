import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { tint } from '@/constants/theme';

// A tinted circle holding an icon: the leading visual of list rows and heroes.
export function IconTile({
  icon,
  color,
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint(color),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={Math.round(size / 2)} color={color} />
    </View>
  );
}
