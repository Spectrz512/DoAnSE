module.exports = { parser: '@typescript-eslint/parser', parserOptions: { project: './tsconfig.json' }, plugins: ['@typescript-eslint', 'prettier'], extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'], root: true, env: { node: true, jest: true }, ignorePatterns: ['.eslintrc.js', 'dist'] };

