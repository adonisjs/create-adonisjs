/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * List of first party templates available for creating new AdonisJS projects.
 * Each template represents a different project starter kit with its own configuration
 * and dependencies.
 *
 * @example
 * ```ts
 * const hyperMediaTemplate = templates.find(t => t.alias === 'hypermedia')
 * console.log(hyperMediaTemplate.source)
 * // Output: 'github:adonisjs/starter-kits/hypermedia'
 * ```
 */
export const templates = [
  {
    name: 'Hypermedia app',
    alias: 'hypermedia',
    hint: 'A fullstack application using server-side templates',
    source: 'github:adonisjs/starter-kits/hypermedia',
  },
  {
    name: 'React app (using Inertia)',
    alias: 'react',
    hint: 'A fullstack React application with E2E type-safety',
    source: 'github:adonisjs/starter-kits/inertia-react',
  },
  {
    name: 'Vue app (using Inertia)',
    alias: 'vue',
    hint: 'A fullstack Vue application with E2E type-safety',
    source: 'github:adonisjs/starter-kits/inertia-vue',
  },
  {
    name: 'API (monorepo)',
    alias: 'api',
    hint: 'Type-safe REST API with dual authentication',
    source: 'github:adonisjs/starter-kits/api',
  },
]
