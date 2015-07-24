# Ponyshow - Create great-looking slides from simple Markdown files

![Ponyshow Logo](https://monosnap.com/file/crHvGYE38jcQhxZeCTC6Rlznqj63S4.png)

> Note: This project is in active development and will change (or break). Consider it alpha / beta.

Ponyshow is an app for turning your markdown files into beautiful presentations.  It's a simpler, faster way to create, view and share high quality presentations.

Features include: 

- "Live view" rendering
- Custom themes
- Auto layouts
- Localization
- Code snippet support with syntax highlighting
- Image positioning and styling
- Background images
- Dynamic text styling
- Websockets
- Video player support
- Real-time collaborative editing
- Interactive components: polls, exams, etc
- Export to PDF
- Slide configuration options
- Slide timer for auto transitioning
- Build steps to present bullet points one step at at time

Write down your thoughts in your favorite markdown / text editor, and Ponyshow will convert them into beautiful presentations on the fly.  Make a change.. it's instantly visible.

## "Ponyshow is a Deckset killer".

If you've used [Deckset](http://www.decksetapp.com/), you are going to love Ponyshow.. especially if you have been wanting custom themes and more control over the final rendering.  Ponyshow gives you FULL control over content, rendering and delivery.

There's many more possibilities with Ponyshow.  Run, pony run!

# Pony what?

Ever heard of the expression, "[dog and pony show](https://en.wikipedia.org/wiki/Dog_and_pony_show)"?  An ode to Shakespeare, *The Show Of Mr. Dogg And Mr. Poneigh* "bringest the butts to the seats."  That is to say, it's the best damn show on earth.  This is the spirit of Ponyshow, a command-line tool that converts markdown into HTML.

The best dog and pony shows incorporate bad jokes and over the top excitement in presenting information.  Hence the terrible terrible name for such a cool tool.

In reality, Ponyshow reduced cognitive load by using markdown to organize content and web development for rendering slides.  Because it's web-enabled, you have greater flexibility with customizing the final output without the hassle of managing master files, versions, assets, proprietary formats, etc.  Plus the rendering engine is on par with Keynote, Google Slides and Powerpoint.

Point blank: It's the best damn show on earth... especially if you're a developer needing to write presentations.

## Install

Requires node.js.

[![Get it on npm](https://nodei.co/npm/ponyshow.png)](https://nodei.co/npm/ponyshow/)

Install globally and use the ```pony``` command.

```
$ npm install ponyshow -g

$ pony
```

## Usage

Example commands

```
$ pony run [path]				// renders a single presentation or displays a list to choose from
$ pony run --locale en          // set localization to English
$ pony new slide                // create a new deck
$ pony config                   // display global configs
$ pony config set foo=bar       // set a global
$ pony install theme            // view available themes from the Ponyshow Registry
$ pony install theme http://..  // install a specific theme
```

## Ponyshow Decks

A Ponyshow deck is a compressed folder consisting of:
 
```
  deck-directory/
   |-- package.json		// deck configuration
   |-- deck.md			// master slide deck
   |-- assets/			// relative dependencies, images, media, etc
   `-- locales/			// localization files that contain ISO 3166-1 country codes (2 alpha)
```

## Writing Content

You write content using [markdown](http://daringfireball.net/projects/markdown/syntax).  Ponyshow introduces additional syntax tokens that make authoring slides easy.

Here's an example deck:

```
theme:appcelerator-training

#Welcome

just a test

---cover

# Test Slide

---

# Slide 2

---section

# Welcome to Ponyshow

---

# Slide 4

![](http://placehold.it/600x100)

- This is a list
- So is this
```

Here's a rendered deck preview:

![](https://monosnap.com/file/FwGI97CZIR8TCPThKqHpstsxpSQxEQ.png)

### Editing

The entry point for rendering is ```deck.md```, a markdown file that comprises individual slides.  This file is considered your **master** file and will be converted into HTML.  You will want to edit this file in your preferred text editor.

You can write vanilla markdown along with Ponyshow syntax to render beautiful presentations.  All other markdown files will be ignored.  In future releases, there will be support for adding rendering multiple files into one deck.

**Live View**

During editing, changes will immediately reflect in the browser viewer enabling you to see "live" changes.  

Note: if the browser doesn't update, simply manually refresh.

### Ponyshow Syntax

Markdown, Kramdown and Deckset tokens are supported.  Official docs are coming soon.  To get started you can create a new deck to see a rendered output.

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

Ponyshow is made possible by the [Shower](https://github.com/shower/shower) open source project and other [open source software](https://github.com/Ponyshow/ponyshow/wiki/Credits).

See LICENSE for more info.

<img
src="http://c.statcounter.com/10534093/0/9ad73f33/1/"
alt="website statistics" style="border:none;">