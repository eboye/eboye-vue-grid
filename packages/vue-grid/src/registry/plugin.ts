import { computed, inject, type ComputedRef, type InjectionKey, type Plugin } from 'vue'
import type { FormatContext, VueGridConfig } from '../types'

export const GRID_CONFIG_KEY: InjectionKey<VueGridConfig> = Symbol('vue-grid:config')
export const FORMAT_CONTEXT_KEY: InjectionKey<ComputedRef<FormatContext>> = Symbol('vue-grid:format')

/**
 * App-wide defaults: extra renderers and formatting context.
 *
 * ```ts
 * app.use(createVueGrid({ renderers: [ratingRenderer], locale: 'de-DE', currency: 'EUR' }))
 * ```
 */
export function createVueGrid(config: VueGridConfig = {}): Plugin {
  return {
    install(app) {
      app.provide(GRID_CONFIG_KEY, config)
    },
  }
}

const browserLocale = () =>
  (typeof navigator !== 'undefined' && navigator.language) || 'en-US'

const fallback = computed<FormatContext>(() => ({ locale: browserLocale(), currency: 'USD' }))

/**
 * Formatting context (locale, currency, time zone) for renderers. Resolved from the nearest
 * `<VGrid>` props, then `createVueGrid` config, then the browser.
 */
export function useGridContext(): ComputedRef<FormatContext> {
  return inject(FORMAT_CONTEXT_KEY, fallback)
}

export function resolveFormatContext(
  props: Partial<FormatContext>,
  config: VueGridConfig | undefined,
): FormatContext {
  return {
    locale: props.locale ?? config?.locale ?? browserLocale(),
    currency: props.currency ?? config?.currency ?? 'USD',
    timeZone: props.timeZone ?? config?.timeZone,
  }
}
