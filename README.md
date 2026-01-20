# create-adonisjs

Scaffold a new AdonisJS application using starter kits

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Starter kits

You can use between one of the following official starter kits, or bring your own using the `--kit` flag.

- `hypermedia`: A fullstack application using server-side templates, alongside Alpine.js and optionally Unpoly.
- `react`: A fullstack React application with E2E type-safety. Inertia is used as a bridge between the frontend and the backend.
- `vue`: A fullstack Vue application with E2E type-safety. Inertia is used as a bridge between the frontend and the backend.
- `api`: Type-safe REST API with dual authentication (monorepo structure).

## Usage

```sh
# Using npm
npm init adonisjs@next

# Using yarn
yarn create adonisjs@next

# Using pnpm
pnpm create adonisjs@next
```

## Options

### `destination`

You can pass the destination directory as the first argument to the command. For example:

```sh
npm init adonisjs@next my-app
```

This argument is optional and the command will prompt you to enter the directory name if not provided.

> **Note** - The directory must be empty otherwise the command will fail.

### `--kit` (Default: Triggers prompt for selection)

If you want to use your own starter kit hosted on GitHub, GitLab, or Bitbucket, you can use the `--kit` flag to define the repo URL. You can also use the starter kit aliases (`hypermedia`, `react`, `vue`, `api`) to quickly select an official starter kit.

```sh
# Use an official starter kit by alias
npm init adonisjs@next -- --kit="hypermedia"

# Download from GitHub
npm init adonisjs@next -- --kit="github:github_user/repo"

# GitHub is the default provider, so if not specified, it will be assumed as github
npm init adonisjs@next -- --kit="github_user/repo"

# Download from GitLab
npm init adonisjs@next -- --kit="gitlab:user/repo"

# Download from Bitbucket
npm init adonisjs@next -- --kit="bitbucket:user/repo"
```

You can also specify the branch or tag name as follows:

```sh
# Branch name
npm init adonisjs@next -- --kit="github:github_user/repo#branch-name"

# Tag name
npm init adonisjs@next -- --kit="github:github_user/repo#v1.0.0"
```

### `--token` (Default: undefined)

If you are using a custom starter kit hosted on a private repository, then you can pass the authentication token as follows:

```sh
npm init adonisjs@next -- --kit="github:github_user/repo" --token="github_token"
```

### `--pkg` (Default: Auto detects)

We are trying to detect the package manager used by your project. However, if you want to force a specific package manager, then you can pass it as follows:

```sh
npm init adonisjs@next -- --pkg="yarn"
```

### Other options

| Option              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `--git-init`        | Initialize git repository.                      |
| `--skip-migrations` | Skip running database migrations automatically. |
| `--verbose`         | Enable verbose mode to display all logs.        |

## Custom starter kits

You can create your own starter kits and use them with `create-adonisjs`. To support advanced features like monorepo structures, you can add a `create-adonisjs.json` file at the root of your starter kit:

```json
{
  "workspaces": true,
  "backendSource": "apps/backend"
}
```

**Configuration options:**

- `workspaces` (boolean): Set to `true` if your starter kit is a monorepo.
- `backendSource` (string): The relative path to the backend source directory in a monorepo. This is where the AdonisJS application resides.

The `create-adonisjs.json` file will be automatically deleted after the starter kit is processed.

## Debugging errors

If creating a new project fails, then you must re-run the same command with the `--verbose` flag to view all the logs.

```sh
npm init adonisjs@next -- --verbose
```

## Contributing

One of the primary goals of AdonisJS is to have a vibrant community of users and contributors who believes in the principles of the framework.

We encourage you to read the [contribution guide](https://github.com/adonisjs/.github/blob/main/docs/CONTRIBUTING.md) before contributing to the framework.

## Code of Conduct

In order to ensure that the AdonisJS community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/adonisjs/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License

create-adonisjs is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/adonisjs/create-adonisjs/checks.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/adonisjs/create-adonisjs/actions/workflows/checks.yml 'Github action'
[npm-image]: https://img.shields.io/npm/v/create-adonisjs/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/create-adonisjs/v/latest 'npm'
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[license-url]: LICENSE.md
[license-image]: https://img.shields.io/github/license/adonisjs/create-adonisjs?style=for-the-badge
