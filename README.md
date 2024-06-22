# create-adonisjs

Scaffold a new AdonisJS application using starter kits

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Starter kits

You can use between one of the following official starter kits, or bring your own using the `--kit` flag.

- `api` : AdonisJS application tailored for building HTTP APIs.
- `web` : AdonisJS application tailored for building server-side rendered applications.
- `slim` : Smallest possible AdonisJS application. Still way more powerful and batteries included than a express application.
- `inertia`: AdonisJS application tailored for building applications using InertiaJS and your favorite frontend framework (Vue, React, Svelte, Solid).

## Usage

```sh
# Using npm
npm init adonisjs

# Using yarn
yarn create adonisjs

# Using pnpm
pnpm create adonisjs
```

## Options

### `destination`

You can pass the destination directory as the first argument to the command. For example:

```sh
npm init adonisjs my-app
```

This argument is optional and the command will prompt you to enter the directory name if not provided.

> **Note** - The directory must be empty otherwise the command will fail.

### `--kit` (Default: Triggers prompt for selection)

If you want to use your own starter kit hosted on Github, Gitlab, or Bitbucket, you can use the `--kit` flag to define the repo URL.

```sh
# Download from GitHub
npm init adonisjs -- --kit="github:github_user/repo"

# Github is the default provider, so if not specified, it will be assumed as github
npm init adonisjs -- --kit="github_user/repo"

# Download from GitLab
npm init adonisjs -- --kit="gitlab:user/repo"

# Download from BitBucket
npm init adonisjs -- --kit="bitbucket:user/repo"
```

You can also pass specify the branch or tag name as follows:

```sh
# Branch name
npm init adonisjs -- --kit="github:github_user/repo#branch-name"

# Tag name
npm init adonisjs -- --kit="github:github_user/repo#v1.0.0"
```

### `--token` (Default: undefined)

If you are using a custom starter kit hosted on a private repository, then you can pass the authentication token as follows:

```sh
npm init adonisjs -- --kit="github:github_user/repo" --token="github_token"
```

### `--pkg` (Default: Auto detects)

We are trying to detect the package manager used by your project. However, if you want to force a specific package manager, then you can pass it as follows:

```sh
npm init adonisjs -- --pkg="yarn"
```

### `--auth-guard` (Default: Triggers prompt for selection)

Specify a custom auth guard to use when using the `api` stater kit. One of the following options are allowed

- `session`
- `access_tokens`

```sh
npm init adonisjs -- --kit="api" --auth-guard="access_tokens"
```

### `--db` (Default: Triggers prompt for selection)

Specify the database dialect to configure with Lucid. One of the following options are allowd.

- `sqlite`
- `mysql`
- `mssql`
- `postgres`

```sh
npm init adonisjs -- --kit="web" --db="mysql"
```

### Other options

| Option       | Description                             |
| ------------ | --------------------------------------- |
| `--git-init` | Initialize git repository.              |
| `--verbose`  | Enable verbose mode to display all logs |

## Debugging errors

If creating a new project fails, then you must re-run the same command with the `--verbose` flag to view all the logs.

```sh
npm init adonisjs -- --verbose
```

## Contributing

One of the primary goals of AdonisJS is to have a vibrant community of users and contributors who believes in the principles of the framework.

We encourage you to read the [contribution guide](https://github.com/adonisjs/.github/blob/main/docs/CONTRIBUTING.md) before contributing to the framework.

## Code of Conduct

In order to ensure that the AdonisJS community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/adonisjs/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License

create-adonisjs is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/adonisjs/create-adonisjs/test.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/adonisjs/create-adonisjs/actions/workflows/test.yml 'Github action'
[npm-image]: https://img.shields.io/npm/v/create-adonisjs/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/create-adonisjs/v/latest 'npm'
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[license-url]: LICENSE.md
[license-image]: https://img.shields.io/github/license/adonisjs/create-adonisjs?style=for-the-badge
