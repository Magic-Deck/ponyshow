# Ponyshow - Great-looking slides from simple Markdown files

Ponyshow is a command line tool for turning your markdown files into beautiful presentations.

It's simple! Write down your thoughts in your favorite markdown / text editor, and Ponyshow will convert them into beautiful presentations on the fly.  Make a change.. it's instantly visible.

## Ponyshow is a Deckset killer.

If you've used Deckset, you going to love Ponyshow.. especially if you have been wanting custom themes and more control over the final rendering.  Ponyshow gives you FULL control over content, rendering and delivery.

Run, pony run!

# Pony what?

Ever heard of the expression, "[dog and pony show](https://en.wikipedia.org/wiki/Dog_and_pony_show)"?  An ode to Shakespeare, *The Show Of Mr. Dogg And Mr. Poneigh* "bringest the butts to the seats."  That is to say, it's the best damn show on earth.  This is the spirit of Ponyshow, a command-line tool that converts markdown into HTML.

The best dog and pony shows incorporate bad jokes and over the top excitement in presenting information.  Hence the terrible terrible name for such a cool tool.

In reality, Ponyshow reduced cognitive load by using markdown to organize content and web development for rendering slides.  Because it's web-enabled, you have greater flexibility with customizing the final output without the hassle of managing master files, versions, assets, proprietary formats, etc.  Plus the rendering engine is on par with Keynote, Google Slides and Powerpoint.

Point blank: It's the best damn show on earth... especially if you're a developer needing to write presentations.

## Install

Requires node.js.

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

Ponyshow is made possible by the [Shower](https://github.com/shower/shower) open source project and other [open source software](https://github.com/Ponyshow/ponyshow-cli/wiki/Credits).

See LICENSE for more info.