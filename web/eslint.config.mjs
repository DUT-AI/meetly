import nextConfig from 'eslint-config-next';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  ...nextConfig,
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
];
