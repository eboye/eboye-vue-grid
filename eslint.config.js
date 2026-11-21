import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { ignores: ['**/dist/**', '**/node_modules/**', 'test-results/**', 'playwright-report/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      'vue/no-v-html': 'error',
      'vue/multi-word-component-names': 'off',
      // Type-based optional props are simply `undefined`; runtime defaults add nothing.
      'vue/require-default-prop': 'off',
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write', message: 'Never use document.write.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Never assign innerHTML.',
        },
      ],
    },
  },
  {
    files: ['**/test/**', 'e2e/**'],
    rules: {
      'vue/one-component-per-file': 'off',
      'vue/require-prop-types': 'off',
    },
  },
)
