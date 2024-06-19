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
    message: 'Vue 3',
    name: 'vue',
  },
  {
    message: 'React',
    name: 'react',
  },
  {
    message: 'Svelte',
    name: 'svelte',
  },
  {
    message: 'Solid.js',
    name: 'solid',
  },
  {
    name: 'skip',
    message: 'Skip',
    hint: 'I want to configure Interia manually',
  },
]
