import {useMemo} from 'react';
import {StatusBar as RNStatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const StatusBar = () => {
  const {top} = useSafeAreaInsets();

  const containerStyle = useMemo(() => {
    return {
      paddingTop: top,
    };
  }, [top]);

  return (
    <View style={containerStyle}>
      <RNStatusBar
        showHideTransition="slide"
        barStyle={'dark-content'}
        backgroundColor={'#F7F7F7'}
        translucent
        animated
      />
    </View>
  );
};

export default StatusBar;
