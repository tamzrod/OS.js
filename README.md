<p align="center">
  <img alt="OS.js Logo" src="https://raw.githubusercontent.com/os-js/gfx/master/logo-big.png" />
</p>

# OS.js

[OS.js](https://www.os-js.org/) is an [open-source](https://raw.githubusercontent.com/os-js/OS.js/master/LICENSE) web desktop platform with a window manager, application APIs, GUI toolkit, filesystem abstractions and much more.

**Backing/Donations:**
[Github sponsorship](https://github.com/sponsors/andersevenrud),
[Patreon](https://www.patreon.com/user?u=2978551&ty=h&u=2978551),
[OpenCollective](https://opencollective.com/osjs),
[LibrePay](https://liberapay.com/os-js/),
[PayPal](https://paypal.me/andersevenrud),
[Bitcoin](https://manual.os-js.org/wallet.png)

**Support:**
[Chat](https://gitter.im/os-js/OS.js),
[Forums](https://community.os-js.org/),
[Twitter](https://twitter.com/osjsorg),
[Facebook](https://www.facebook.com/os.js.org)

## Introduction

This is the OS.js base repository that you can use as a template to make your own distributions, installations and development environments.

## Try it yourself

Visit the [official demo](https://demo.os-js.org/) for a preview version. Please note that some features are disabled and might be outdated or unavailable at times.

![ScreenShot](https://www.os-js.org/screenshot.png)

## Documentation

See the [official manuals](https://manual.os-js.org/) for articles, tutorials and guides.

There's also a [contribution guide](https://github.com/os-js/OS.js/blob/master/CONTRIBUTING.md) if you want to contribute to this project.

## Installation

### Authentication persistence migration

This fork removes browser-managed authentication credential persistence and the vulnerable `js-cookie` dependency. Deployments that previously enabled `auth.cookie` must remove that configuration and perform the documented one-time server-side legacy-cookie cleanup before rollout. Reload requires explicit login unless a separately reviewed server-session resume feature is added.

See [the G2 authentication cookie migration guide](docs/g2-cookie-persistence-migration.md) for configuration, cleanup, and operational details.

> OS.js runs on `http://localhost:8000` by default.

### Using a pre-made image

You can use the official Docker base image to run OS.js without downloading this repository.

This image is based on this source code and comes with a minimal setup.

```bash
docker run -p 8000:8000 osjs/osjs:latest
```

### Using this repository

Clone the master branch:

> You can also download an archived version (ex. zip file) instead of using git.

```bash
git clone -b master --single-branch https://github.com/os-js/OS.js.git
cd OS.js
```

#### Docker Compose installation

The easiest way to install is to use Docker Compose. This allows you to run a single command
to set everything up:

```bash
docker-compose up
```

#### Local installation

You can also install this directly onto your system by using the following set of commands.

> **NOTE:** Development and CI require Node.js 26.13.0 and npm 11.20.0. Use
> `.nvmrc` to select the supported Node version. Other versions are rejected by
> the project manifest. The legacy Webpack build is not yet compatible with this
> runtime; remediation is tracked by the security roadmap and must not use
> `--openssl-legacy-provider`.

```bash
# Install the exact locked dependencies
npm ci

# Optionally install extra packages:
# For a list of packages, see https://manual.os-js.org/resource/official/
npm install @osjs/example-application

# Discover installed packages
npm run package:discover

# Build client
npm run build

# Start serving
npm run serve
```
