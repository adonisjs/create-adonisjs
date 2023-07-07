/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Kernel } from '@adonisjs/ace'
import { InstallAdonis } from './src/install_adonis.js'

Kernel.defaultCommand = InstallAdonis
export const kernel = Kernel.create()
