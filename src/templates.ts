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
    hint: 'A full-stack app using server-side templates',
    source: 'github:adonisjs/starter-kits/hypermedia',
  },
  {
    name: 'React app (using Inertia)',
    alias: 'react',
    hint: 'A full-stack React app with end-to-end type safety',
    source: 'github:adonisjs/starter-kits/inertia-react',
  },
  {
    name: 'Vue app (using Inertia)',
    alias: 'vue',
    hint: 'A full-stack Vue app with end-to-end type safety',
    source: 'github:adonisjs/starter-kits/inertia-vue',
  },
  {
    name: 'API',
    alias: 'api',
    hint: 'A type-safe REST API with session and access token auth',
    source: 'github:adonisjs/starter-kits/api',
  },
  {
    name: 'API (monorepo)',
    alias: 'api-monorepo',
    hint: 'A monorepo setup with a type-safe REST API',
    source: 'github:adonisjs/starter-kits/api-monorepo',
  },
]
