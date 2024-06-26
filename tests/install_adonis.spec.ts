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
import { databases } from '../src/databases.js'
import { authGuards } from '../src/auth_guards.js'

const VERBOSE = !!process.env.CI

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
      '--db=sqlite',
      '--auth-guard=session',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('use github as default provider', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--kit="samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for destination when not provided', async ({ assert }) => {
    const command = await kernel.create(CreateNewApp, [
      '--db=sqlite',
      '--auth-guard=session',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
    command.prompt.trap('Where should we create your new project').replyWith('tmp/foo')
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for kit selection when not pre-defined', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      // not provide `--db` and `--auth-guard` to test that it will not prompt for slim kit
    ])

    command.verbose = VERBOSE
    command.prompt.trap('Which starter kit would you like to use').chooseOption(0)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })

  test('prompt for auth guard when not pre-defined and selected api/web kit', async ({
    assert,
    fs,
  }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=web',
      '--db=sqlite',
    ])

    command.verbose = VERBOSE
    command.prompt.trap('Which authentication guard you want to use').chooseOption(1)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileExists('foo/config/auth.ts')
  })

  test('prompt for database driver when not pre-defined and selected api/web kit', async ({
    assert,
    fs,
  }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=api',
      '--auth-guard=session',
    ])

    command.verbose = VERBOSE
    command.prompt.trap('Which database driver you want to use').chooseOption(1)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileExists('foo/config/database.ts')
  })

  test('do not configure lucid when user skip database driver selection', async ({
    assert,
    fs,
  }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=web',
      '--auth-guard=session',
    ])

    command.verbose = VERBOSE

    const skippingIndex = databases.findIndex((db) => db.name === 'skip')
    command.prompt.trap('Which database driver you want to use').chooseOption(skippingIndex)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileNotExists('foo/config/database.ts')
  })

  test('do not configure auth when user skip auth guard selection', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=web',
      '--db=sqlite',
    ])

    command.verbose = VERBOSE

    const skippingIndex = authGuards.findIndex((db) => db.name === 'skip')
    command.prompt.trap('Which authentication guard you want to use').chooseOption(skippingIndex)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileNotExists('foo/config/auth.ts')
  })

  test('fail if destination directory already exists', async ({ assert, fs }) => {
    await fs.create('foo/bar.txt', '')

    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--kit="github:samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
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
        '--db=sqlite',
        '--auth-guard=session',
        '--kit="github:samuelmarina/is-even"',
      ])

      command.verbose = VERBOSE
      await command.exec()

      await assert.fileExists(`foo/${lockFile}`)

      process.env.npm_config_user_agent = undefined
    })

  test('initialize git repo when --git-init flag is provided', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--git-init',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.dirExists('foo/.git')
  })

  test('force package manager', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="yarn"',
      '--db=sqlite',
      '--auth-guard=session',
      '--kit="github:samuelmarina/is-even"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileExists('foo/yarn.lock')
  })

  test('configure slim starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })

  test('create .env file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.verbose = VERBOSE
    await command.exec()
    await assert.fileExists('foo/.env')
  })

  test('remove README file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.verbose = VERBOSE
    await command.exec()
    await assert.fileNotExists('foo/README.md')
  })

  test('rename package name inside package.json file', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo/bar'),
      '--pkg="npm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.verbose = VERBOSE
    await command.exec()
    await assert.fileContains('foo/bar/package.json', `"name": "bar"`)
  })
})

test.group('Configure | Web starter kit', (group) => {
  group.each.disableTimeout()

  test('configure lucid and auth when using web starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--db=sqlite',
      '--auth-guard=session',
      '-K=web',
    ])

    command.verbose = VERBOSE
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
      '-K=web',
      '--auth-guard=session',
      '--db=postgres',
    ])

    command.verbose = VERBOSE
    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileContains('foo/config/database.ts', [`client: 'pg'`])
    await assert.fileContains('foo/package.json', ['pg'])
  })
})

test.group('Configure | API starter kit', (group) => {
  group.each.disableTimeout()

  test('configure lucid and auth when using api starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=api',
      '--db=sqlite',
      '--auth-guard=session',
    ])

    command.verbose = VERBOSE
    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileContains('foo/adonisrc.ts', [
      `() => import('@adonisjs/lucid/database_provider')`,
      `() => import('@adonisjs/auth/auth_provider')`,
      `() => import('@adonisjs/session/session_provider')`,
      `() => import('@adonisjs/lucid/commands')`,
    ])
    await assert.fileContains('foo/start/kernel.ts', [
      `() => import('@adonisjs/session/session_middleware')`,
    ])
    await assert.fileExists('foo/config/database.ts')
    await assert.fileExists('foo/config/auth.ts')
    await assert.fileExists('foo/config/session.ts')
    await assert.fileExists('foo/app/models/user.ts')
    await assert.fileContains('foo/package.json', [
      '@adonisjs/session',
      '@adonisjs/lucid',
      '@adonisjs/auth',
      'luxon',
      '@types/luxon',
      'better-sqlite',
    ])
  })

  test('do not configure session package when using access tokens guard', async ({
    assert,
    fs,
  }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=api',
      '--db=sqlite',
      '--auth-guard=access_tokens',
    ])

    command.verbose = VERBOSE
    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileNotContains('foo/adonisrc.ts', [
      `() => import('@adonisjs/session/session_provider')`,
    ])
    await assert.fileNotContains('foo/start/kernel.ts', [
      `() => import('@adonisjs/session/session_middleware')`,
    ])
    await assert.fileNotExists('foo/config/session.ts')
    await assert.fileNotContains('foo/package.json', ['@adonisjs/session'])
  })
})

test.group('Configure | Inertia Starter Kit', (group) => {
  group.each.disableTimeout()

  test('configure lucid/auth/inertia when using inertia starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '-K=inertia',
      '--db=sqlite',
      '--auth-guard=session',
      '--ssr',
      '--adapter=solid',
    ])

    command.verbose = VERBOSE
    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })
    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')

    await assert.fileContains('foo/adonisrc.ts', [
      `() => import('@adonisjs/lucid/database_provider')`,
      `() => import('@adonisjs/auth/auth_provider')`,
      `() => import('@adonisjs/session/session_provider')`,
      `() => import('@adonisjs/lucid/commands')`,
    ])
    await assert.fileContains('foo/start/kernel.ts', [
      `() => import('@adonisjs/session/session_middleware')`,
    ])
    await assert.fileExists('foo/config/database.ts')
    await assert.fileExists('foo/config/auth.ts')
    await assert.fileExists('foo/inertia/app/app.tsx')
    await assert.fileExists('foo/inertia/app/ssr.tsx')
    await assert.fileExists('foo/config/inertia.ts')
    await assert.fileExists('foo/config/session.ts')
    await assert.fileExists('foo/app/models/user.ts')
    await assert.fileContains('foo/package.json', [
      '@adonisjs/session',
      '@adonisjs/lucid',
      '@adonisjs/inertia',
      'solid-js',
      'vite-plugin-solid',
      '@adonisjs/auth',
      'luxon',
      '@types/luxon',
      'better-sqlite',
    ])
  })
})
