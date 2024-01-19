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
import { basename, isAbsolute, join, relative } from 'node:path'
import { BaseCommand, args, flags } from '@adonisjs/ace'
import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises'

import { templates } from '../src/templates.js'

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
    default: 'sqlite',
  })
  declare db?: string

  /**
   * Auth guard for auth package. Defaults to "session"
   */
  @flags.string({
    description: 'Define the authentication guard for the Auth package',
    default: 'session',
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
      'CiAgICBfX18gICAgICAgX18gICAgICAgICAgICBfICAgICAgICAgIF8gICAgIAogICAvICAgfCBfX19fLyAvX19fICBfX19fICAoXylfX19fICAgIChfKV9fX18KICAvIC98IHwvIF9fICAvIF9fIFwvIF9fIFwvIC8gX19fLyAgIC8gLyBfX18vCiAvIF9fXyAvIC9fLyAvIC9fLyAvIC8gLyAvIChfXyAgKSAgIC8gKF9fICApIAovXy8gIHxfXF9fLF8vXF9fX18vXy8gL18vXy9fX19fKF8pXy8gL19fX18vICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvX19fLyAgICAgICAg==',
      'base64'
    ).toString()

    this.logger.log('')
    this.logger.log(`${gradient.mind(title)}`)
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
   * Prompt to check if we should install dependencies?
   */
  async #promptForInstallingDeps() {
    if (this.install === undefined) {
      this.install = await this.prompt.confirm(
        `Do you want us to install dependencies using "${this.packageManager}"?`,
        {
          default: true,
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

    const argv = ['ace', 'configure', '@adonisjs/lucid', '--db', this.db]
    if (this.verbose) {
      argv.push('--verbose')
    }

    if (this.install) {
      argv.push('--install')
    } else {
      argv.push('--no-install')
    }

    await this.#runBashCommand('node', argv)
  }

  /**
   * Configures the Auth package
   */
  async #configureAuth() {
    this.authGuard = this.authGuard || 'session'
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
    await this.#promptForInstallingDeps()

    /**
     * Create tasks instance for displaying
     * actions as tasks
     */
    const tasks = this.ui.tasks({ verbose: this.verbose === true })

    const configureLucid = this.kit === 'github:adonisjs/web-starter-kit' && this.install !== false
    const configureAuth = this.kit === 'github:adonisjs/web-starter-kit' && this.install !== false

    tasks
      .add('Download starter kit', async (task) => {
        task.update(`Downloading "${this.kit}"`)
        await downloadTemplate(this.kit!, { dir: this.destination, auth: this.token })
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
