module.exports = {
  ci: {
    collect: {
      staticDistDir: './apps/web/.next',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
  },
};
