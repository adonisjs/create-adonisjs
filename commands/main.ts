/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { cwd } from 'node:process'
import { existsSync } from 'node:fs'
import gradient from 'gradient-string'
import { downloadTemplate } from 'giget'
import { type Options, execa } from 'execa'
import detectPackageManager from 'which-pm-runs'
import { installPackage } from '@antfu/install-pkg'
import { BaseCommand, args, flags } from '@adonisjs/ace'
import { basename, isAbsolute, join, relative } from 'node:path'
import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises'

import { templates } from '../src/templates.js'
import { databases } from '../src/databases.js'
import { authGuards } from '../src/auth_guards.js'

/**
 * Creates a new AdonisJS application and configures it
 */
export class CreateNewApp extends BaseCommand {
  static commandName = 'create-adonisjs'
  static description = 'Create a new AdonisJS application using a starter kit'

  /**
   * The directory where the project will be created
   */
  @args.string({ description: 'Destination directory', required: false })
  declare destination: string

  /**
   * The starter kit to use
   *
   * @example
   *   --kit github_user/repo
   *   --kit gitlab_user/repo#develop
   *   --kit bitbucket_user/repo#2.0.0
   */
  @flags.string({
    description: 'Define path to a custom git repository to download the starter kit',
    alias: 'K',
  })
  declare kit?: string

  /**
   * Authentication token to download private templates
   */
  @flags.string({
    description: 'Pass the authentication token to download private repositories',
    alias: 't',
  })
  declare token?: string

  /**
   * Auto install packages after creating the project. Display prompt
   * when flag is not mentioned.
   */
  @flags.boolean({
    description: 'Install packages after creating the project',
    showNegatedVariantInHelp: true,
  })
  declare install?: boolean

  /**
   * Init git repository. Do not init when flag is not mentioned.
   */
  @flags.boolean({
    description: 'Init Git repository using the "git init" command',
  })
  declare gitInit?: boolean

  /**
   * Package manager to use. Detect package manager when flag is not
   * mentioned.
   */
  @flags.string({
    description: 'Define the package manager to install dependencies',
    flagName: 'pkg',
  })
  declare packageManager: string

  /**
   * Database dialect for Lucid. Defaults to "sqlite"
   */
  @flags.string({
    description: 'Define the database dialect to use with Lucid',
  })
  declare db?: string

  /**
   * Auth guard for auth package.
   */
  @flags.string({
    description: 'Define the authentication guard for the Auth package',
  })
  declare authGuard?: string

  /**
   * Execute tasks in verbose mode. Defaults to false.
   */
  @flags.boolean({
    description: 'Execute tasks in verbose mode',
    alias: 'v',
  })
  declare verbose?: boolean

  /**
   * Runs bash command using execa with shared defaults
   */
  async #runBashCommand(file: string, cliArgs: string[], options?: Options) {
    await execa(file, cliArgs, {
      cwd: this.destination,
      preferLocal: true,
      windowsHide: false,
      buffer: false,
      stdio: this.verbose === true ? 'inherit' : 'ignore',
      ...options,
    })
  }

  /**
   * Prints AdonisJS as ASCII art
   */
  #printBannerArt() {
    const title = Buffer.from(
      'ICAgICBfICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgIF8gX19fXyAgCiAgICAvIFwgICBfX3wgfCBfX18gIF8gX18gKF8pX19fICAgIHwgLyBfX198IAogICAvIF8gXCAvIF9gIHwvIF8gXHwgJ18gXHwgLyBfX3xfICB8IFxfX18gXCAKICAvIF9fXyBcIChffCB8IChfKSB8IHwgfCB8IFxfXyBcIHxffCB8X19fKSB8CiAvXy8gICBcX1xfXyxffFxfX18vfF98IHxffF98X19fL1xfX18vfF9fX18vIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=',
      'base64'
    ).toString()

    this.logger.log('')
    this.logger.log(`${gradient.mind.multiline(title)}`)
    this.logger.log('')
  }

  /**
   * Print the success message
   */
  #printSuccessMessage() {
    this.logger.log('')

    this.ui
      .instructions()
      .heading('Your AdonisJS project has been created successfully!')
      .add(this.colors.cyan('cd ' + relative(cwd(), this.destination)))
      .add(this.colors.cyan(`${this.packageManager} run dev`))
      .add(this.colors.cyan('Open http://localhost:3333'))
      .add('')
      .add(`Have any questions?`)
      .add(`Join our Discord server - ${this.colors.yellow('https://discord.gg/vDcEjq6')}`)
      .render()
  }

  /**
   * Prompt for the destination directory
   */
  async #promptForDestination() {
    if (!this.destination) {
      this.destination = await this.prompt.ask('Where should we create your new project?', {
        default: './my-adonisjs-app',
      })
    }

    this.destination = isAbsolute(this.destination)
      ? this.destination
      : join(cwd(), this.destination)
  }

  /**
   * Prompt to configure a starter kit
   */
  async #promptForStarterKit() {
    if (!this.kit) {
      /**
       * Display prompt when "kit" flag is not used.
       */
      const template = await this.prompt.choice(
        'Which starter kit would you like to use?',
        templates
      )
      this.kit = templates.find((t) => t.name === template)!.source
    } else {
      /**
       * Allowing users to mention aliases via the CLI flag.
       */
      const matchingTemplatingFromAlias = templates.find((t) => t.alias === this.kit)
      if (matchingTemplatingFromAlias) {
        this.kit = matchingTemplatingFromAlias.source
      }
    }
  }

  /**
   * Prompt to select a database driver
   */
  async #promptForDatabaseDriver() {
    if (!this.db) {
      /**
       * Display prompt when "db" flag is not used.
       */
      const database = await this.prompt.choice(
        'Select the database driver you want to use',
        databases
      )
      this.db = databases.find((t) => t.name === database)!.alias
    }
  }

  /**
   * Prompt to select a auth guard
   */
  async #promptForAuthGuard() {
    if (!this.authGuard) {
      /**
       * Display prompt when "authGuard" flag is not used.
       */
      const guard = await this.prompt.choice(
        'Select the authentication guard you want to use',
        authGuards
      )
      this.authGuard = authGuards.find((t) => t.name === guard)!.alias
    }
  }

  /**
   * Prompt to check if we should install dependencies?
   */
  async #promptForInstallingDeps() {
    if (this.install === undefined) {
      this.install = await this.prompt.confirm(
        `Do you want us to install dependencies using "${this.packageManager}"?`,
        {
          default: true,
          hint: "(If not, you'll need to configure guards and database manually)",
        }
      )
    }
  }

  /**
   * Replace the package.json name with the destination directory name.
   * Errors are ignored.
   */
  async #replacePackageJsonName() {
    const pkgJsonPath = join(this.destination, 'package.json')

    const pkgJson = await readFile(pkgJsonPath, 'utf-8').then(JSON.parse)
    pkgJson.name = basename(this.destination)

    await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
  }

  /**
   * Optionally removes readme file. Errors are ignored
   */
  async #removeReadmeFile() {
    await unlink(join(this.destination, 'README.md'))
  }

  /**
   * Optionally remove existing lock file. Errors are ignored
   */
  async #removeLockFile() {
    await Promise.allSettled([
      unlink(join(this.destination, 'package-lock.json')),
      unlink(join(this.destination, 'yarn.lock')),
      unlink(join(this.destination, 'pnpm-lock.yaml')),
    ])
  }

  /**
   * If starter template has an `.env.example` file, then copy it to `.env`
   */
  async #copyEnvExampleFile() {
    const envPath = join(this.destination, '.env')
    const envExamplePath = join(this.destination, '.env.example')

    if (existsSync(envExamplePath)) {
      await copyFile(envExamplePath, envPath)
    }
  }

  /**
   * Generate a fresh app key. Errors are ignored
   */
  async #generateFreshAppKey() {
    if (this.install === false) {
      return
    }

    await this.#runBashCommand('node', ['ace', 'generate:key'])
  }

  /**
   * Configures the Lucid package
   */
  async #configureLucid() {
    this.db = this.db || 'sqlite'

    const argv = ['ace', 'configure', '@adonisjs/lucid', '--db', this.db, '--install']
    if (this.verbose) {
      argv.push('--verbose')
    }

    await this.#runBashCommand('node', argv)
  }

  /**
   * Configures the session package
   */
  async #configureSession() {
    await installPackage(['@adonisjs/session@latest'], {
      cwd: this.destination,
      packageManager: this.packageManager,
      silent: !this.verbose,
    })

    const argv = ['ace', 'configure', '@adonisjs/session']
    if (this.verbose) {
      argv.push('--verbose')
    }

    await this.#runBashCommand('node', argv)
  }

  /**
   * Configures the Auth package
   */
  async #configureAuth() {
    this.authGuard = this.authGuard || 'session'

    /**
     * Install the session package when using api starter kit with session
     * guard. This needs to be done, since the api starter kit does
     * not install the session package by default.
     */
    if (this.authGuard === 'session' && this.kit === 'github:adonisjs/api-starter-kit') {
      await this.#configureSession()
    }

    /**
     * Next configure the auth package
     */
    const argv = ['ace', 'configure', '@adonisjs/auth', '--guard', this.authGuard]
    if (this.verbose) {
      argv.push('--verbose')
    }

    await this.#runBashCommand('node', argv)
  }

  /**
   * Main method
   */
  async run() {
    this.packageManager = this.packageManager || detectPackageManager()?.name || 'npm'

    /**
     * Print ASCII art
     */
    this.#printBannerArt()

    /**
     * Display prompts
     */
    await this.#promptForDestination()
    await this.#promptForStarterKit()
    if (
      this.kit === 'github:adonisjs/web-starter-kit' ||
      this.kit === 'github:adonisjs/api-starter-kit'
    ) {
      await this.#promptForAuthGuard()
      await this.#promptForDatabaseDriver()
    }
    await this.#promptForInstallingDeps()

    /**
     * Create tasks instance for displaying
     * actions as tasks
     */
    const tasks = this.ui.tasks({ verbose: this.verbose === true })

    /**
     * Configure lucid when using web or api starter kits
     * and installing dependencies
     */
    const configureLucid =
      (this.kit === 'github:adonisjs/web-starter-kit' ||
        this.kit === 'github:adonisjs/api-starter-kit') &&
      this.db !== undefined &&
      this.install !== false

    /**
     * Configure auth when using web or api starter kits
     * and installing dependencies
     */
    const configureAuth =
      (this.kit === 'github:adonisjs/web-starter-kit' ||
        this.kit === 'github:adonisjs/api-starter-kit') &&
      this.authGuard !== undefined &&
      this.install !== false

    tasks
      .add('Download starter kit', async (task) => {
        task.update(`Downloading "${this.kit}"`)
        await downloadTemplate(this.kit!, {
          dir: this.destination,
          auth: this.token,
          registry: false,
        })
        await this.#removeLockFile()
        return `Downloaded "${this.kit}"`
      })
      .addIf(this.gitInit === true, 'Initialize git repository', async () => {
        await this.#runBashCommand('git', ['init'])
        return 'Initialized git repository'
      })
      .addIf(this.install !== false, 'Install packages', async (task) => {
        const spinner = this.logger.await('installing dependencies', {
          silent: this.verbose,
        })

        spinner.tap((line) => task.update(line))
        spinner.start()

        try {
          await this.#runBashCommand(this.packageManager, ['install'])
          return `Packages installed using "${this.packageManager}"`
        } finally {
          spinner.stop()
        }
      })
      .add('Prepare application', async () => {
        try {
          await this.#replacePackageJsonName()
          await this.#removeReadmeFile()
          await this.#copyEnvExampleFile()
          await this.#generateFreshAppKey()
          return 'Application ready'
        } catch (error) {
          if (this.verbose) {
            this.logger.fatal(error)
          }
          return 'Unable to prepare application'
        }
      })
      .addIf(configureLucid, 'Configure Lucid', async (task) => {
        const spinner = this.logger.await('configuring @adonisjs/lucid', {
          silent: this.verbose,
        })

        spinner.tap((line) => task.update(line))
        spinner.start()

        try {
          await this.#configureLucid()
          spinner.stop()
          return `Lucid configured to use "${this.db}" database`
        } catch (error) {
          spinner.stop()
          if (this.verbose) {
            this.logger.fatal(error)
          }
          return `Unable to configure "@adonisjs/lucid"`
        }
      })
      .addIf(configureAuth, 'Configure Auth', async (task) => {
        const spinner = this.logger.await('configuring @adonisjs/auth', {
          silent: this.verbose,
        })

        spinner.tap((line) => task.update(line))
        spinner.start()

        try {
          await this.#configureAuth()
          spinner.stop()
          return `Auth configured to use "${this.authGuard}" guard`
        } catch (error) {
          spinner.stop()

          if (this.verbose) {
            this.logger.fatal(error)
          }
          return `Unable to configure "@adonisjs/auth"`
        }
      })

    await tasks.run()
    if (tasks.getState() === 'succeeded') {
      this.#printSuccessMessage()
    } else {
      this.exitCode = 1
    }
  }
}
