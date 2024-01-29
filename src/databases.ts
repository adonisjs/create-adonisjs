/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * List of first party databases (lucid)
 */
export const databases = [
  {
    name: 'SQLite',
    alias: 'sqlite',
  },
  {
    name: 'MySQL / MariaDB',
    alias: 'mysql',
  },
  {
    name: 'PostgreSQL',
    alias: 'postgres',
  },
  {
    name: 'Microsoft SQL Server',
    alias: 'mssql',
  },
  {
    name: 'Skip',
    hint: 'I want to configures the Lucid package by myself.',
    alias: undefined,
  },
]
