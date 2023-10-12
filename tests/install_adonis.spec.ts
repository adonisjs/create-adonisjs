/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { execa } from 'execa'
import { join } from 'node:path'
import { test } from '@japa/runner'

import { kernel } from '../index.js'
import { CreateNewApp } from '../commands/main.js'

test.group('Create new app', (group) => {
  group.each.setup(() => {
    kernel.ui.switchMode('raw')
    return () => {
      kernel.ui.switchMode('normal')
    }
  })

  test('clone template to destination', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-install',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for destination when not provided', async ({ assert }) => {
    const command = await kernel.create(CreateNewApp, [
      '--skip-install',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.prompt.trap('Where should we create the project?').replyWith('tmp/foo')
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('fail if destination directory already exists', async ({ assert, fs }) => {
    await fs.create('foo/bar.txt', '')

    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-install',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileNotExists('foo/package.json')

    command.assertFailed()
    command.assertLogMatches(/Destination .* already exists/, 'stderr')
  })

  test('install dependencies using detected package manager - {agent}')
    .with([
      { agent: 'npm/7.0.0 node/v15.0.0 darwin x64', lockFile: 'package-lock.json' },
      { agent: 'pnpm/5.0.0 node/v15.0.0 darwin x64', lockFile: 'pnpm-lock.yaml' },
      { agent: 'yarn/1.22.5 npm/? node/v15.0.0 darwin x64', lockFile: 'yarn.lock' },
    ])
    .run(async ({ assert, fs }, { agent, lockFile }) => {
      process.env.npm_config_user_agent = agent

      const command = await kernel.create(CreateNewApp, [
        join(fs.basePath, 'foo'),
        '--skip-git-init',
        '--kit="github:samuelmarina/is-even"',
      ])
      command.prompt.trap('Do you want to install dependencies?').replyWith(true)

      await command.exec()

      await assert.fileExists(`foo/${lockFile}`)

      process.env.npm_config_user_agent = undefined
    })

  test('do not install dependencies', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-install',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.fileNotExists(`foo/package-lock.json`)
  })

  test('initialize git repo', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-install',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()

    await assert.dirExists('foo/.git')
  })

  test('do not initialize git repo', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-install',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.dirNotExists('foo/.git')
  })

  test('force package manager', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="yarn"',
      '--skip-git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)

    await command.exec()

    await assert.fileExists('foo/yarn.lock')
  })

  test('configure slim starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  }).disableTimeout()

  test('prompt for kit selection when not pre-defined', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [join(fs.basePath, 'foo'), '--pkg="npm"'])

    command.prompt.trap('Select the template you want to use').chooseOption(0)
    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  }).disableTimeout()

  test('copy .env', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()
    await assert.fileExists('foo/.env')
  }).disableTimeout()

  test('remove README file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()
    await assert.fileNotExists('foo/README.md')
  }).disableTimeout()
})
