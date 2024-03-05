/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * List of adapters for configuring Inertia
 */
export const adapters = [
  {
    name: 'Vue 3',
    alias: 'vue',
  },
  {
    name: 'React',
    alias: 'react',
  },
  {
    name: 'Svelte',
    alias: 'svelte',
  },
  {
    name: 'Solid.js',
    alias: 'solid',
  },
  {
    name: 'Skip',
    hint: 'I want to configure Inertia by myself.',
    alias: undefined,
  },
]
