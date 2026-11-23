/* eslint-disable @typescript-eslint/no-explicit-any -- stories use untyped rows, like Storybook args */
import type {
  AllowedComponentProps,
  ComponentCustomProps,
  ConcreteComponent,
  VNodeProps,
} from 'vue'
import { VGrid } from '@nocopypaste/vue-grid'

/** The props (and `on*` listeners) of `<VGrid>` for a given row type. */
export type GridArgs<T = any> = Omit<
  NonNullable<Parameters<typeof VGrid<T>>[0]>,
  keyof VNodeProps | keyof AllowedComponentProps | keyof ComponentCustomProps
>

/**
 * `<VGrid>` is a generic SFC (`<script setup generic="T">`), which Storybook's `Meta<typeof C>` can't
 * type. This is the same component object typed as a plain component; stories use
 * `satisfies Meta<GridArgs>` so `args` are checked against the grid's real props. Apps use `VGrid`.
 */
export const Grid = VGrid as unknown as ConcreteComponent<GridArgs>
