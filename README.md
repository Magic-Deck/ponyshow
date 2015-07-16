# Ponyshow CLI

A command line tool for rendering Ponyshow presentations.

## Install

[![Get it on npm](https://nodei.co/npm/ponyshow-cli.png)](https://nodei.co/npm/ponyshow-cli/)

Install globally and use ```pony``` command.

```
npm install ponyshow-cli -g

```

## Usage

Example commands

```
$ pony run [path]               // renders a single presentation or displays a list to choose from
$ pony run --locale en          // set localization to English
$ pony new slide                // create a new deck
$ pony config                   // display global configs
$ pony config set foo=bar       // set a global
$ pony install theme            // view available themes from the Ponyshow Registry
$ pony install theme http://..  // install a specific theme
```

## Pony Decks

A Ponyshow deck is a folder consisting of
 
```
- deck.md               // master slide deck
- package.json          // deck configuration
- assets/               // relative dependencies, images, media, etc
- locales/              // localization files that contain ISO 3166-1 country codes (2 alpha)
```

## Pony Files

Deck.md is considered the "master" markdown file that will render an entire slide deck.  You can write vanilla markdown along with Ponyshow syntax to render beautiful presentations.  All other markdown files will be ignored.  In future releases, there will be support for adding rendering multiple files into one deck.

## Ponyshow Syntax

Ponyshow presentations are written in [markdown](http://daringfireball.net/projects/markdown/syntax) with additional syntax tokens.  Official docs are coming soon.  To get started you can create a new deck to see a rendered output.

### Localization Files

Ponyshow supports rendering localized versions of a master deck. You can set localization for the master deck in the ```package.json``` file, or at run time using the following command:

```
$ pony run --locale es
```

If a localization file doesn't exist, you will be prompted to create one.  This will simply copy the master and create a new file with the naming convention of ```locales/[country-code].md```.  The renderer will explicitly look for 2-alpha country code files.

Ponyshow also supports i18n for configuration files (coming soon).


## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the Apache 2 license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## Author

TZ Martin <martin@semanticpress.com>

## License

Copyright (c) 2015, Semantic Press (Apache 2 Licensed)

See LICENSE for more info.