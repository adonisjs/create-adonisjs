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

  group.each.disableTimeout()

  test('clone template to destination', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--no-install',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for destination when not provided', async ({ assert }) => {
    const command = await kernel.create(CreateNewApp, [
      '--no-install',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.prompt.trap('Where should we create your new project?').replyWith('tmp/foo')
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for kit selection when not pre-defined', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--install',
    ])

    command.prompt.trap('Which starter kit would you like to use?').chooseOption(0)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })

  test('prompt for install dependencies when --install flag is not used', async ({
    assert,
    fs,
  }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=slim',
    ])

    command.prompt.trap('Do you want us to install dependencies using "npm"?').replyWith(true)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })

  test('fail if destination directory already exists', async ({ assert, fs }) => {
    await fs.create('foo/bar.txt', '')

    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--no-install',
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
        '--install',
        '--kit="github:samuelmarina/is-even"',
      ])

      await command.exec()

      await assert.fileExists(`foo/${lockFile}`)

      process.env.npm_config_user_agent = undefined
    })

  test('do not install dependencies when --no-install flag is provided', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--no-install',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.fileNotExists(`foo/package-lock.json`)
  })

  test('initialize git repo when --git-init flag is provided', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--no-install',
      '--git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.dirExists('foo/.git')
  })

  test('force package manager', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="yarn"',
      '--install',
      '--kit="github:samuelmarina/is-even"',
    ])

    await command.exec()

    await assert.fileExists('foo/yarn.lock')
  })

  test('configure slim starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--install',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })

  test('create .env file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--no-install',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    await command.exec()
    await assert.fileExists('foo/.env')
  })

  test('remove README file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--no-install',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    await command.exec()
    await assert.fileNotExists('foo/README.md')
  })

  test('rename package name inside package.json file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo/bar'),
      '--pkg="npm"',
      '--no-install',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    await command.exec()
    await assert.fileContains('foo/bar/package.json', `"name": "bar"`)
  })
})

test.group('Configure | Web starter kit', () => {
  test('configure lucid and auth when using web starter kits', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--install',
      '-K=web',
    ])

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileContains('foo/adonisrc.ts', [
      `() => import('@adonisjs/lucid/database_provider')`,
      `() => import('@adonisjs/auth/auth_provider')`,
      `() => import('@adonisjs/lucid/commands')`,
    ])
    await assert.fileExists('foo/config/database.ts')
    await assert.fileExists('foo/config/auth.ts')
    await assert.fileExists('foo/app/models/user.ts')
    await assert.fileContains('foo/package.json', [
      '@adonisjs/lucid',
      '@adonisjs/auth',
      'luxon',
      '@types/luxon',
      'better-sqlite',
    ])
  })

  test('configure lucid package to use postgresql', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--install',
      '-K=web',
      '--db=postgres',
    ])

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileContains('foo/config/database.ts', [`client: 'pg'`])
    await assert.fileContains('foo/package.json', ['pg'])
  })
})
