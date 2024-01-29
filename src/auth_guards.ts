/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * List of first party authentication guards
 */
export const authGuards = [
  {
    name: 'Session',
    alias: 'session',
    hint: 'Authenticate users using cookies and session.',
  },
  {
    name: 'Access Token',
    alias: 'access_tokens',
    hint: 'Authenticate clients using tokens.',
  },
  {
    name: 'Skip',
    alias: undefined,
    hint: 'I want to configures guards by myself.',
  },
]
