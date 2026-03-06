import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  online?: boolean;
}

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

const getInitials = (name: string) =>
  name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const getColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

const Avatar = ({uri, name = '', size = 44, online}: AvatarProps) => {
  return (
    <View style={[styles.wrapper, {width: size, height: size}]}>
      {uri ? (
        <Image
          source={{uri}}
          style={[
            styles.image,
            {width: size, height: size, borderRadius: size / 2},
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getColor(name),
            },
          ]}>
          <Text style={[styles.initials, {fontSize: size * 0.38}]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.27,
              height: size * 0.27,
              borderRadius: size * 0.135,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {position: 'relative'},
  image: {resizeMode: 'cover'},
  placeholder: {alignItems: 'center', justifyContent: 'center'},
  initials: {color: '#fff', fontWeight: '700'},
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default Avatar;
