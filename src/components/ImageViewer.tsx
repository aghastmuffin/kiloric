import {
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';

type Props = {
  imgSource: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
};

export default function ImageViewer({ imgSource, style }: Props) {
  const resolvedStyle = StyleSheet.flatten([styles.image, style]);

  return (
    <View
      style={{
        width: resolvedStyle?.width,
        height: resolvedStyle?.height,
        borderRadius: resolvedStyle?.borderRadius,
        overflow: 'hidden',
      }}>
      <Image
        source={imgSource}
        style={resolvedStyle}
        contentFit="contain"
        enforceEarlyResizing
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 320,
    height: 440,
    borderRadius: 18,
  },
});
