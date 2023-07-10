/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cwd } from 'node:process'

import { BaseCommand, args, flags } from '@adonisjs/ace'
import detectPackageManager from 'which-pm-runs'
import { downloadTemplate } from 'giget'
import gradient from 'gradient-string'
import { execa } from 'execa'

import { templates } from './templates.js'

export class InstallAdonis extends BaseCommand {
  static commandName = 'create-adonisjs'
  static description = 'Install AdonisJS'

  /**
   * The directory where the project will be created
   */
  @args.string({ description: 'Destination directory', name: 'destination', required: false })
  declare destination: string

  /**
   * The starter kit to use
   *
   * @example
   *   --kit github_user/repo
   *   --kit gitlab_user/repo#develop
   *   --kit bitbucket_user/repo#2.0.0
   */
  @flags.string({ description: 'Starter kit to use', name: 'kit', alias: 'K' })
  declare kit?: string

  /**
   * Authentication token to download private templates kit
   */
  @flags.string({ description: 'Authentication token', name: 'token', alias: 't' })
  declare token?: string

  /**
   * Skip dependencies installation
   */
  @flags.boolean({ description: 'Skip dependencies installation', name: 'skip-install' })
  declare skipInstall: boolean

  /**
   * Skip git initialization
   */
  @flags.boolean({ description: 'Skip git initialization', name: 'skip-git-init' })
  declare skipGitInit: boolean

  /**
   * The detected package manager ( based on agent )
   */
  #detectedPkgManager!: string

  /**
   * Whether or not dependencies were installed
   */
  #hasInstalledDependencies!: boolean

  /**
   * Print the title
   */
  #printTitle() {
    const adonisGradient = gradient([
      { color: '#5A45FF', pos: 0 },
      { color: '#7c6dff', pos: 0.2 },
    ])

    const title = Buffer.from(
      'CiAgICBfX18gICAgICAgX18gICAgICAgICAgICBfICAgICAgICAgIF8gICAgIAogICAvICAgfCBfX19fLyAvX19fICBfX19fICAoXylfX19fICAgIChfKV9fX18KICAvIC98IHwvIF9fICAvIF9fIFwvIF9fIFwvIC8gX19fLyAgIC8gLyBfX18vCiAvIF9fXyAvIC9fLyAvIC9fLyAvIC8gLyAvIChfXyAgKSAgIC8gKF9fICApIAovXy8gIHxfXF9fLF8vXF9fX18vXy8gL18vXy9fX19fKF8pXy8gL19fX18vICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvX19fLyAgICAgICAg==',
      'base64'
    ).toString()

    this.logger.log('')
    this.logger.log(`${adonisGradient.multiline(title)}`)
    this.logger.log('')
    this.logger.log(
      this.colors.italic(`          A fully-featured web\n          framework for Node.js`)
    )
    this.logger.log('')
    this.logger.log('')
  }

  /**
   * Prompt for the destination directory
   */
  async #promptDestination() {
    if (this.destination) return

    this.destination = await this.prompt.ask('Where should we create the project?', {
      default: `./` + relative(cwd(), './my-adonisjs-app'),
    })
  }

  /**
   * Prompt and download the selected template
   */
  async #downloadTemplate() {
    this.logger.log('')

    let templateSource = this.kit
    if (!templateSource) {
      const template = await this.prompt.choice('Which template do you want to use?', templates)
      templateSource = templates.find((t) => t.name === template)!.source
    }

    const spinner = this.logger.await(`Downloading ${templateSource} template`).start()

    try {
      await downloadTemplate(templateSource, { dir: this.destination, auth: this.token })
      spinner.update('Template downloaded successfully').stop()
    } catch (error) {
      spinner.update('Failed to download template').stop()
      throw error
    }
  }

  /**
   * Install dependencies with the detected package manager
   */
  async #installDependencies() {
    if (this.skipInstall) return

    this.logger.log('')
    const pkgManager = this.#detectedPkgManager

    this.#hasInstalledDependencies = await this.prompt.confirm(
      'Do you want to install dependencies?',
      {
        hint: pkgManager + ' will be used',
        default: true,
      }
    )

    if (!this.#hasInstalledDependencies) return

    const spinner = this.logger.await(`Installing dependencies using ${pkgManager}`).start()

    try {
      await execa(pkgManager, ['install'], { cwd: this.destination })
      spinner.update('Dependencies installed successfully').stop()
    } catch (error) {
      spinner.stop()
      this.error = `Failed to install dependencies :\n${error.stderr}`
      throw error
    }
  }

  /**
   * Init git repository inside the destination directory
   */
  async #initGitRepo() {
    if (this.skipGitInit) return

    this.logger.log('')

    const shouldInit = await this.prompt.confirm('Do you want to initialize a git repository?', {
      default: true,
    })

    if (!shouldInit) return

    try {
      await execa('git', ['init'], { cwd: this.destination })
      this.logger.success('Git repository initialized successfully')
    } catch (error) {
      this.error = `Failed to initialize git repository :\n${error.stderr}`
      throw error
    }
  }

  /**
   * Print the success message
   */
  #printSuccessMessage() {
    this.logger.log('')

    this.ui
      .sticker()
      .heading('Your AdonisJS project was created successfully !')
      .add(`1. ${this.colors.magenta('cd ' + relative(cwd(), this.destination))}`)
      .add(`2. ${this.colors.magenta(`${this.#detectedPkgManager} run dev`)}`)
      .add(`3. ${this.colors.magenta('Visit http://localhost:3333')}`)
      .add('')
      .add(
        `Have any questions? Join our Discord server: ${this.colors.magenta(
          'https://discord.gg/vDcEjq6'
        )}`
      )
      .render()

    this.logger.log('')
  }

  /**
   * Replace the package.json name with the destination directory name
   */
  async #replacePackageJsonName() {
    const pkgJsonPath = join(this.destination, 'package.json')
    const pkgJson = await readFile(pkgJsonPath, 'utf-8').then(JSON.parse)

    pkgJson.name = relative(cwd(), this.destination)

    await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
  }

  /**
   * If starter template has an `.env.example` file, then copy it to `.env`
   */
  async #copyEnvExampleFile() {
    const envExamplePath = join(this.destination, '.env.example')

    const hasEnvExample = existsSync(envExamplePath)
    if (!hasEnvExample) return

    const envPath = join(this.destination, '.env')
    await copyFile(envExamplePath, envPath)
  }

  /**
   * Generate a fresh app key
   */
  async #generateFreshAppKey() {
    if (!this.#hasInstalledDependencies) return

    try {
      await execa('node', ['ace', 'generate:key'], { cwd: this.destination })
    } catch (error) {
      this.logger.warning('Failed to generate app key : ' + error.stderr)
    }
  }

  /**
   * Execute the `run` method and catch errors
   */
  async exec() {
    this.hydrate()

    try {
      await this.run()
    } catch (error) {
      this.logger.fatal(this.error || error.message)
      this.exitCode = 1
    }
  }

  /**
   * Main method
   */
  async run() {
    this.#detectedPkgManager = detectPackageManager()?.name || 'npm'

    this.#printTitle()

    await this.#promptDestination()
    await this.#downloadTemplate()
    await this.#installDependencies()
    await this.#initGitRepo()
    await this.#replacePackageJsonName()
    await this.#copyEnvExampleFile()
    await this.#generateFreshAppKey()

    this.#printSuccessMessage()
  }
}
