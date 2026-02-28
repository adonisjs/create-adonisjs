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

import { kernel } from '../index.ts'
import { CreateNewApp } from '../commands/main.ts'

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
    const command = await kernel.create(CreateNewApp, ['--kit="github:samuelmarina/is-even"'])

    command.verbose = VERBOSE
    command.prompt.trap('Where should we create your new project?').replyWith('tmp/foo')
    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('prompt for kit selection when not pre-defined', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [join(fs.basePath, 'foo'), '--pkg="npm"'])

    command.verbose = VERBOSE
    command.prompt.trap('Select the kind of app you want to create?').chooseOption(0)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
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
      { agent: 'npm/11.0.0 node/v15.0.0 darwin x64', lockFile: 'package-lock.json' },
      { agent: 'pnpm/10.0.0 node/v15.0.0 darwin x64', lockFile: 'pnpm-lock.yaml' },
    ])
    .run(async ({ assert, fs }, { agent, lockFile }) => {
      process.env.npm_config_user_agent = agent

      const command = await kernel.create(CreateNewApp, [
        join(fs.basePath, 'foo'),
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
      '--pkg="pnpm"',
      '--kit="github:adonisjs/slim-starter-kit"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileExists('foo/pnpm-lock.yaml')
  })

  test('configure hypermedia starter kit', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--kit="github:adonisjs/starter-kits/hypermedia"',
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

  test('keep pnpm-workspace.yaml and remove workspaces from package.json when using pnpm', async ({
    assert,
    fs,
    cleanup,
  }) => {
    process.env.npm_config_user_agent = 'pnpm/10.0.0 node/v15.0.0 darwin x64'
    cleanup(() => {
      delete process.env.npm_config_user_agent
    })
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--skip-migrations',
      '--kit="github:adonisjs/starter-kits/api"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileExists('foo/pnpm-workspace.yaml')
    await assert.fileContains('foo/pnpm-workspace.yaml', "- 'apps/*'")

    const pkgJson = JSON.parse(await fs.contents('foo/package.json'))
    assert.include(pkgJson.packageManager, 'pnpm')
    assert.notProperty(pkgJson, 'workspaces')
  })

  test('keep .yarnrc.yml and workspaces in package.json when using yarn', async ({
    assert,
    fs,
    cleanup,
  }) => {
    process.env.npm_config_user_agent = 'npm/11.0.0 node/v15.0.0 darwin x64'
    cleanup(() => {
      delete process.env.npm_config_user_agent
    })
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="yarn"',
      '--skip-migrations',
      '--kit="github:adonisjs/starter-kits/api"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileExists('foo/.yarnrc.yml')

    const pkgJson = JSON.parse(await fs.contents('foo/package.json'))
    assert.include(pkgJson.packageManager, 'yarn')
    assert.property(pkgJson, 'workspaces')
  })

  test('remove pnpm-workspace.yaml when not using pnpm', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--skip-migrations',
      '--kit="github:adonisjs/starter-kits/api"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileNotExists('foo/pnpm-workspace.yaml')
    await assert.fileContains('foo/package.json', '"workspaces"')
  })

  test('remove .yarnrc.yml when not using yarn', async ({ assert, fs }) => {
    const command = await kernel.create(CreateNewApp, [
      join(fs.basePath, 'foo'),
      '--pkg="npm"',
      '--skip-migrations',
      '--kit="github:adonisjs/starter-kits/api"',
    ])

    command.verbose = VERBOSE
    await command.exec()

    await assert.fileNotExists('foo/.yarnrc.yml')
    await assert.fileContains('foo/package.json', '"workspaces"')
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
