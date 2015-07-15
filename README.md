# Ponyshow CLI

A command line tool for rendering Ponyshow presentations.

## Install

[![Get it on npm](https://nodei.co/npm/ponyshow-cli.png)](https://nodei.co/npm/ponyshow-cli/)

Install globally and use ```pony``` command.

```
npm install ponyshow-cli -g

```

## Usage

### Run

```
$ pony run [path]
```

Render a single presentation, or if several folders are found, display a list of presentations to choose from.  A static file server is included for hosting presentations.

### New

- Slide

Create a new Ponyshow slide repo.  This walks you through a list of questions and generates a directory containing: 

- deck.md
- package.json
- assets/

```deck.md``` contains all slide content for a slide deck.

### Install

- Theme

```
$ pony install theme {path/to/git-repo}

```

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the Apache 2 license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## Author

TZ Martin <martin@semanticpress.com>

## License

Copyright (c) 2015, Semantic Press (Apache 2 Licensed)

See LICENSE for more info.