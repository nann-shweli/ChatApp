/**
 * Simple UUID v4 generator compatible with React Native / Metro bundler.
 * Avoids the `uuid` package's ESM exports that Metro cannot resolve.
 */
export const v4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default v4;
