import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../vitest.shared';

const projectSpecific = defineConfig({
  test: {
    coverage: {
      include: ['src'],
    },
  },
});
export default mergeConfig(configShared, projectSpecific);
