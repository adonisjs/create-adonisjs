/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DIALECTS } from '@adonisjs/presets/lucid'

/**
 * List of known databases that can be used with Lucid
 */
export const databases = [
  ...Object.keys(DIALECTS).map((dialect) => {
    return {
      name: dialect as keyof typeof DIALECTS,
      message: DIALECTS[dialect as keyof typeof DIALECTS].name,
    }
  }),
  {
    name: 'skip',
    message: 'Skip',
    hint: 'I want to configure Lucid manually',
  },
]
