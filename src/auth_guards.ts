/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { GUARDS } from '@adonisjs/presets/auth'

/**
 * List of known authentication guards
 */
export const authGuards = [
  ...Object.keys(GUARDS).map((guard) => {
    return {
      name: guard as keyof typeof GUARDS,
      hint: GUARDS[guard as keyof typeof GUARDS].description,
      message: GUARDS[guard as keyof typeof GUARDS].name,
    }
  }),
  {
    name: 'skip',
    message: 'Skip',
    hint: 'I want to configure the Auth package manually',
  },
]
