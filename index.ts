/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HelpCommand, Kernel } from '@adonisjs/ace'
import { InstallAdonis } from './src/install_adonis.js'

Kernel.defaultCommand = InstallAdonis

export const kernel = Kernel.create()

kernel.defineFlag('help', {
  type: 'boolean',
  description: HelpCommand.description,
})

kernel.on('help', async (command, $kernel, parsed) => {
  parsed.args.unshift(command.commandName)
  await new HelpCommand($kernel, parsed, kernel.ui, kernel.prompt).exec()
  return $kernel.shortcircuit()
})
