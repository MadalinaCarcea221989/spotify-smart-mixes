module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  rules: {
    indent: ['error', 2],
    'linebreak-style': 'off', // Different OS have different line endings
    quotes: ['warn', 'single'],
    semi: ['error', 'always'],
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console statements for this project
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-undef': 'warn', // Relax undefined variable check
    'no-case-declarations': 'off', // Allow lexical declarations in case blocks
  },
  globals: {
    CONFIG: 'readonly',
    SpotifyApi: 'readonly',
    SimpleSpotifyAuth: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    EnhancedMusicDatabase: 'readonly',
    MusicDatabase: 'readonly',
    fetch: 'readonly',
    showStatus: 'readonly',
    updateStatus: 'readonly',
  },
  ignorePatterns: [
    'node_modules/',
    'spotify-venv/',
    '.venv/',
    'venv/',
    'dist/',
    'build/',
  ],
};
