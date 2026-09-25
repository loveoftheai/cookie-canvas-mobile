module.exports = {
  presets: [
    [
      'module:metro-react-native-babel-preset',
      // 'default' (not 'hermes-stable'): we ship JSC on aarch64, so optional
      // chaining / nullish coalescing MUST be transpiled or JSC fails to parse.
      {unstable_transformProfile: 'default'},
    ],
  ],
};
