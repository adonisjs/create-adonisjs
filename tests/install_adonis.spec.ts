import { test } from '@japa/runner'
import { kernel } from '../index.js'
import { InstallAdonis } from '../src/install_adonis.js'
import { join } from 'node:path'
import { execa } from 'execa'

test.group('Install Adonis', (group) => {
  group.each.setup(() => {
    kernel.ui.switchMode('raw')
    return () => {
      kernel.ui.switchMode('normal')
    }
  })

  test('Clone template to correct destination', async ({ assert, fs }) => {
    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.kit = 'github:samuelmarina/is-even'
    command.skipInstall = true
    command.skipGitInit = true

    await command.exec()

    await assert.dirIsNotEmpty('foo')
    await assert.fileExists('foo/package.json')
  })

  test('fail if destination directory already exists', async ({ assert, fs }) => {
    await fs.create('foo/bar.txt', '')

    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.kit = 'github:samuelmarina/is-even'
    command.skipInstall = true
    command.skipGitInit = true

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

      const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

      command.prompt.trap('Do you want to install dependencies?').replyWith(true)

      command.kit = 'github:samuelmarina/is-even'
      command.skipInstall = false
      command.skipGitInit = true
      await command.exec()

      await assert.fileExists(`foo/${lockFile}`)

      process.env.npm_config_user_agent = undefined
    })

  test('initialize git repo', async ({ assert, fs }) => {
    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    command.kit = 'github:samuelmarina/is-even'
    command.skipInstall = true
    command.skipGitInit = false

    await command.exec()

    await assert.dirExists('foo/.git')
  })

  test('force package manager', async ({ assert, fs }) => {
    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.kit = 'github:samuelmarina/is-even'
    command.packageManager = 'yarn'
    command.skipGitInit = true
    command.prompt.trap('Do you want to install dependencies?').replyWith(true)

    await command.exec()

    await assert.fileExists('foo/yarn.lock')
  })

  test('valid adonis installation - todo when starter kits are public', async ({ assert, fs }) => {
    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.kit = 'github:adonisjs/web-starter-kit'

    command.packageManager = 'pnpm'

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()

    const result = await execa('node', ['ace', '--help'], { cwd: join(fs.basePath, 'foo') })

    assert.deepEqual(result.exitCode, 0)
    assert.deepInclude(result.stdout, 'View list of available commands')
  })
    .disableTimeout()
    .skip(!!process.env.CI, 'Needs to make web-starter-kit repo public')

  test('copy .env', async ({ assert, fs }) => {
    const command = await kernel.create(InstallAdonis, [join(fs.basePath, 'foo')])

    command.kit = 'github:adonisjs/web-starter-kit'

    command.packageManager = 'pnpm'

    command.prompt.trap('Do you want to install dependencies?').replyWith(true)
    command.prompt.trap('Do you want to initialize a git repository?').replyWith(true)

    await command.exec()
    await assert.fileExists('foo/.env')
  })
    .disableTimeout()
    .skip(!!process.env.CI, 'Needs to make web-starter-kit repo public')

  test('generate app key - todo when done')
})
