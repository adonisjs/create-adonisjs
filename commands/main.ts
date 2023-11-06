/*
 * create-adonisjs
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { execa } from 'execa'
import { cwd } from 'node:process'
import { existsSync } from 'node:fs'
import gradient from 'gradient-string'
import { downloadTemplate } from 'giget'
import detectPackageManager from 'which-pm-runs'
import { isAbsolute, join, relative } from 'node:path'
import { BaseCommand, args, flags } from '@adonisjs/ace'
import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises'

import { templates } from '../src/templates.js'

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
    description: 'Define path to a custom git repository',
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
   * Skip packages installation
   */
  @flags.boolean({ description: 'Packages installation' })
  declare install?: boolean

  /**
   * Skip git initialization
   */
  @flags.boolean({ description: 'Git initialization' })
  declare gitInit?: boolean

  /**
   * Package manager to use
   */
  @flags.string({ description: 'Explicitly define the package manager to npm', flagName: 'pkg' })
  declare packageManager: string

  /**
   * Whether or not dependencies were installed
   */
  #shouldInstallDependencies?: boolean

  /**
   * Print the title
   */
  #printTitle() {
    const title = Buffer.from(
      'CiAgICBfX18gICAgICAgX18gICAgICAgICAgICBfICAgICAgICAgIF8gICAgIAogICAvICAgfCBfX19fLyAvX19fICBfX19fICAoXylfX19fICAgIChfKV9fX18KICAvIC98IHwvIF9fICAvIF9fIFwvIF9fIFwvIC8gX19fLyAgIC8gLyBfX18vCiAvIF9fXyAvIC9fLyAvIC9fLyAvIC8gLyAvIChfXyAgKSAgIC8gKF9fICApIAovXy8gIHxfXF9fLF8vXF9fX18vXy8gL18vXy9fX19fKF8pXy8gL19fX18vICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvX19fLyAgICAgICAg==',
      'base64'
    ).toString()

    this.logger.log('')
    this.logger.log(`${gradient.mind(title)}`)
    this.logger.log('')
  }

  /**
   * Prompt for the destination directory
   */
  async #setDestination() {
    if (!this.destination) {
      this.destination = await this.prompt.ask('Where should we create the project?', {
        default: `./` + relative(cwd(), './my-adonisjs-app'),
        result(dir) {
          return isAbsolute(dir) ? dir : join(cwd(), dir)
        },
      })
    }
  }

  /**
   * Prompt and download the selected template
   */
  async #downloadTemplate() {
    if (!this.kit) {
      const template = await this.prompt.choice('Select the template you want to use', templates)
      this.kit = templates.find((t) => t.name === template)!.source
    }

    const spinner = this.logger.await(`Downloading ${this.kit} template`).start()

    try {
      await downloadTemplate(this.kit, { dir: this.destination, auth: this.token })
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
    if (this.install === false) {
      return
    }

    this.#shouldInstallDependencies =
      this.install ||
      (await this.prompt.confirm('Do you want to install dependencies?', {
        hint: this.packageManager + ' will be used',
        default: true,
      }))

    if (!this.#shouldInstallDependencies) {
      return
    }

    const spinner = this.logger
      .await(`Installing dependencies using ${this.packageManager}`)
      .start()

    try {
      await execa(this.packageManager, ['install'], { cwd: this.destination })
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
    if (this.gitInit === false) {
      return
    }

    const shouldInit =
      this.gitInit ||
      (await this.prompt.confirm('Do you want to initialize a git repository?', {
        default: true,
      }))

    if (!shouldInit) {
      return
    }

    try {
      await execa('git', ['init'], { cwd: this.destination })
      this.logger.success('Git repository initialized successfully')
    } catch (error) {
      this.error = `Failed to initialize git repository :\n${error.stderr}`
      throw error
    }
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
    if (!hasEnvExample) {
      return
    }

    const envPath = join(this.destination, '.env')
    await copyFile(envExamplePath, envPath)
  }

  /**
   * Generate a fresh app key
   */
  async #generateFreshAppKey() {
    if (!this.#shouldInstallDependencies) {
      return
    }

    try {
      await execa('node', ['ace', 'generate:key'], { cwd: this.destination })
    } catch (error) {
      this.logger.warning('Failed to generate app key : ' + error.stderr)
    }
  }

  /**
   * Optionally removes readme file
   */
  async #removeReadmeFile() {
    try {
      await unlink(join(this.destination, 'README.md'))
    } catch {}
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
    if (!this.packageManager) {
      this.packageManager = detectPackageManager()?.name || 'npm'
    }

    this.#printTitle()

    await this.#setDestination()
    await this.#downloadTemplate()
    await this.#installDependencies()
    await this.#initGitRepo()
    await this.#replacePackageJsonName()
    await this.#copyEnvExampleFile()
    await this.#generateFreshAppKey()
    await this.#removeReadmeFile()

    this.#printSuccessMessage()
  }
}
