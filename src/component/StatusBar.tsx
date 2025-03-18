import {StatusBar as RNStatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const StatusBar = () => {
  const {top} = useSafeAreaInsets();
  const backgroundColor = '#F7F7F7';

  return (
    <View style={{paddingTop: top, backgroundColor}}>
      <RNStatusBar
        showHideTransition="slide"
        barStyle={'dark-content'}
        translucent
        animated
      />
    </View>
  );
};

export default StatusBar;
