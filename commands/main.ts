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
import { BaseCommand, args, flags } from '@adonisjs/ace'
import { basename, isAbsolute, join, relative } from 'node:path'
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'

import { templates } from '../src/templates.js'

/**
 * Creates a new AdonisJS application and configures it
 */
export class CreateNewApp extends BaseCommand {
  static commandName = 'create-adonisjs'
  static description = 'Create a new AdonisJS application'

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
    description: 'Auth token to download private repositories',
    alias: 't',
  })
  declare token?: string

  /**
   * Init git repository. Do not init when flag is not mentioned.
   */
  @flags.boolean({
    description: 'Init git repository',
  })
  declare gitInit?: boolean

  /**
   * Skip running database migrations. Defaults to false
   */
  @flags.boolean({
    description: 'Skip running database migrations',
  })
  declare skipMigrations?: boolean

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
   * Execute tasks in verbose mode. Defaults to false.
   */
  @flags.boolean({
    description: 'Execute tasks in verbose mode',
    alias: 'v',
  })
  declare verbose?: boolean

  /**
   * Whether the starter kit is a monorepo workspace
   * This property is set after the starter kit has been cloned and inspected
   */
  declare isMonorepo: boolean

  /**
   * The directory containing the backend source code
   * For monorepos, this points to the backend workspace directory.
   * For single packages, this is the same as the destination directory.
   * This property is set after the starter kit has been cloned and inspected
   */
  declare backendSourceDir: string

  /**
   * Inspects the downloaded starter kit by reading the create-adonisjs.json config file.
   * This method determines if the starter kit is a monorepo and identifies the backend
   * source directory location. The config file is deleted after being read.
   *
   * Sets the following properties:
   * - `isMonorepo`: Whether the starter kit uses workspaces
   * - `backendSourceDir`: The absolute path to the backend source code
   *
   * @example
   * await this.#inspectStarterKit()
   * if (this.isMonorepo) {
   *   console.log('Backend is in:', this.backendSourceDir)
   * }
   */
  async #inspectStarterKit() {
    const configFile = join(this.destination, 'create-adonisjs.json')

    try {
      const config = await readFile(configFile, 'utf-8')
      const parsedConfig = JSON.parse(config)

      await unlink(configFile)

      this.isMonorepo = parsedConfig.workspaces ?? false
      this.backendSourceDir = parsedConfig.backendSource
        ? join(this.destination, parsedConfig.backendSource)
        : this.destination
    } catch {
      this.backendSourceDir = this.destination
    }
  }

  /**
   * Adapts the downloaded starter kit for the detected package manager.
   * - For non-pnpm package managers: removes pnpm-workspace.yaml
   * - For non-monorepo starter kits: no further changes are needed
   * - For pnpm monorepos: removes the workspaces field from package.json
   *   since pnpm uses pnpm-workspace.yaml for workspace configuration
   * - For monorepos: sets the packageManager field in package.json to the
   *   detected package manager name and version
   */
  async #adaptForPackageManager() {
    const pkgJsonPath = join(this.destination, 'package.json')
    const pkgJson = await readFile(pkgJsonPath, 'utf-8').then(JSON.parse)
    const pnpmWorkspacePath = join(this.destination, 'pnpm-workspace.yaml')

    if (this.packageManager !== 'pnpm') {
      try {
        await unlink(pnpmWorkspacePath)
      } catch {}
    }

    if (!this.isMonorepo) {
      return
    }

    let dirty = false
    if (this.packageManager === 'pnpm') {
      delete pkgJson.workspaces
      dirty = true
    }

    const detectedPackageManager = detectPackageManager()
    if (detectedPackageManager) {
      pkgJson.packageManager = `${detectedPackageManager.name}@${detectedPackageManager.version}`
      dirty = true
    }

    if (dirty) {
      await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
    }
  }

  /**
   * Executes a bash command using execa with shared default options.
   * Commands are run from the specified source directory with consistent
   * settings for output display based on the verbose flag.
   *
   * @param sourceDir - The working directory to execute the command from
   * @param file - The command or executable to run
   * @param cliArgs - Array of command-line arguments to pass to the command
   * @param options - Optional execa options to override defaults
   *
   * @example
   * await this.#runBashCommand(this.destination, 'git', ['init'])
   * await this.#runBashCommand(this.backendSourceDir, 'node', ['ace', 'generate:key'])
   */
  async #runBashCommand(sourceDir: string, file: string, cliArgs: string[], options?: Options) {
    await execa(file, cliArgs, {
      cwd: sourceDir,
      preferLocal: true,
      windowsHide: false,
      buffer: false,
      stdio: this.verbose === true ? 'inherit' : 'ignore',
      ...options,
    })
  }

  /**
   * Prints the AdonisJS logo as ASCII art using a gradient effect.
   * The banner is displayed at the start of the project creation process
   * to provide visual branding.
   *
   * @example
   * this.#printBannerArt()
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
   * Displays a success message with next steps after the project has been created.
   * Shows instructions for navigating to the project, starting the dev server,
   * and provides a link to the Discord community.
   *
   * @example
   * this.#printSuccessMessage()
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
   * Prompts the user to specify a destination directory if one was not provided
   * as a command argument. Converts relative paths to absolute paths using the
   * current working directory.
   *
   * Sets the `destination` property to the absolute path where the project will be created.
   *
   * @example
   * await this.#promptForDestination()
   * console.log('Creating project at:', this.destination)
   */
  async #promptForDestination() {
    if (!this.destination) {
      this.destination = await this.prompt.ask('Where should we create your new project?', {
        default: './adonisjs-app',
      })
    }

    this.destination = isAbsolute(this.destination)
      ? this.destination
      : join(cwd(), this.destination)
  }

  /**
   * Prompts the user to select a starter kit if one was not provided via the --kit flag.
   * Handles both interactive selection and CLI flag aliases. When multiple templates
   * share the same alias (e.g., "inertia" for different frontend frameworks), prompts
   * the user to choose between them.
   *
   * Sets the `kit` property to the Git repository URL of the selected template.
   *
   * @example
   * await this.#promptForStarterKit()
   * console.log('Using starter kit:', this.kit)
   */
  async #promptForStarterKit() {
    if (!this.kit) {
      /**
       * Display prompt when "kit" flag is not used.
       */
      const template = await this.prompt.choice(
        'Select the kind of app you want to create?',
        templates
      )
      this.kit = templates.find((t) => t.name === template)!.source
    } else {
      /**
       * Allowing users to mention aliases via the CLI flag.
       */
      const matchingTemplate = templates.find((t) => t.alias === this.kit)
      if (matchingTemplate) {
        this.kit = matchingTemplate.source
      }
    }
  }

  /**
   * Updates the package.json name property to match the destination directory name.
   * This ensures the package name reflects the actual project directory rather than
   * the starter kit's default name.
   *
   * @param sourceDir - The directory containing the package.json file to update
   *
   * @example
   * await this.#replacePackageJsonName(this.backendSourceDir)
   */
  async #replacePackageJsonName(sourceDir: string) {
    const pkgJsonPath = join(sourceDir, 'package.json')

    const pkgJson = await readFile(pkgJsonPath, 'utf-8').then(JSON.parse)
    pkgJson.name = basename(sourceDir)

    await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
  }

  /**
   * Removes the README.md file from the destination directory.
   * This allows users to start with a clean slate for their project documentation.
   * Silently ignores errors if the file doesn't exist.
   *
   * @example
   * await this.#removeReadmeFile()
   */
  async #removeReadmeFile() {
    try {
      await unlink(join(this.destination, 'README.md'))
    } catch {}
  }

  /**
   * Removes existing package manager lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
   * from both the destination directory and backend source directory (if different).
   * This ensures a fresh lock file will be generated based on the user's chosen package manager.
   * Silently ignores errors if files don't exist.
   *
   * @example
   * await this.#removeLockFile()
   */
  async #removeLockFile() {
    const filesToRemove = [
      unlink(join(this.destination, 'package-lock.json')),
      unlink(join(this.destination, 'yarn.lock')),
      unlink(join(this.destination, 'pnpm-lock.yaml')),
    ]

    if (this.backendSourceDir !== this.destination) {
      filesToRemove.push(
        ...[
          unlink(join(this.backendSourceDir, 'package-lock.json')),
          unlink(join(this.backendSourceDir, 'yarn.lock')),
          unlink(join(this.backendSourceDir, 'pnpm-lock.yaml')),
        ]
      )
    }
    await Promise.allSettled(filesToRemove)
  }

  /**
   * Copies the .env.example file to .env in the backend source directory if it exists.
   * This provides the user with a properly configured environment file based on the
   * starter kit's defaults.
   *
   * @example
   * await this.#copyEnvExampleFile()
   */
  async #copyEnvExampleFile() {
    const envPath = join(this.backendSourceDir, '.env')
    const envExamplePath = join(this.backendSourceDir, '.env.example')

    if (existsSync(envExamplePath)) {
      await copyFile(envExamplePath, envPath)
    }
  }

  /**
   * Generates a fresh application encryption key by running the `node ace generate:key` command.
   * This creates a secure random key for encrypting cookies and other sensitive data.
   *
   * @example
   * await this.#generateFreshAppKey()
   */
  async #generateFreshAppKey() {
    await this.#runBashCommand(this.backendSourceDir, 'node', ['ace', 'generate:key'])
  }

  /**
   * Creates the tmp directory and runs database migrations by executing `node ace migration:run`.
   * This sets up the initial database schema for the new application.
   *
   * @example
   * await this.#migrateDatabase()
   */
  async #migrateDatabase() {
    await mkdir(join(this.backendSourceDir, 'tmp'))
    await this.#runBashCommand(this.backendSourceDir, 'node', ['ace', 'migration:run'])
  }

  /**
   * Main entry point for the create-adonisjs command.
   * Orchestrates the entire project creation workflow including:
   * - Displaying the AdonisJS banner
   * - Prompting for destination and starter kit selection
   * - Downloading and configuring the starter kit
   * - Installing dependencies
   * - Preparing the application (env files, app key, etc.)
   * - Running database migrations
   * - Displaying success message with next steps
   *
   * @example
   * const command = new CreateNewApp()
   * await command.run()
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

    /**
     * Create tasks instance for displaying
     * actions as tasks
     */
    const tasks = this.ui.tasks({ verbose: this.verbose === true })

    tasks
      .add('Download starter kit', async (task) => {
        task.update(`Downloading "${this.kit}"`)
        await downloadTemplate(this.kit!, {
          dir: this.destination,
          auth: this.token,
          registry: false,
        })
        await this.#inspectStarterKit()
        await this.#adaptForPackageManager()
        await this.#removeLockFile()
        return `Downloaded "${this.kit}"`
      })
      .addIf(this.gitInit === true, 'Initialize git repository', async () => {
        await this.#runBashCommand(this.destination, 'git', ['init'])
        return 'Initialized git repository'
      })
      .add('Install packages', async (task) => {
        const spinner = this.logger.await(`installing dependencies (${this.packageManager})`, {
          silent: this.verbose,
        })

        spinner.tap((line) => task.update(line))
        spinner.start()

        try {
          await this.#runBashCommand(
            this.isMonorepo ? this.destination : this.backendSourceDir,
            this.packageManager,
            ['install']
          )
          return `Packages installed using "${this.packageManager}"`
        } finally {
          spinner.stop()
        }
      })
      .add('Prepare application', async (task) => {
        try {
          await this.#replacePackageJsonName(
            this.isMonorepo ? this.destination : this.backendSourceDir
          )
          await this.#removeReadmeFile()
          await this.#copyEnvExampleFile()
          await this.#generateFreshAppKey()
          return 'Application ready'
        } catch (error) {
          if (this.verbose) {
            this.logger.fatal(error)
            return task.error('Unable to prepare application')
          }
          return task.error(error)
        }
      })
      .addIf(!this.skipMigrations, 'Migrate database', async (task) => {
        try {
          await this.#migrateDatabase()
          return 'Database migrated'
        } catch (error) {
          if (this.verbose) {
            this.logger.fatal(error)
            return task.error('Unable to migrate database')
          }
          return task.error(error)
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
