/**
 * Main entry point for the Pony Show CLI. Responsible for loading the CLI
 * configuration, initializing the i18n system, defining global options and 
 * flags, and running the main CLI logic.
 *
 * @module ponyshow-cli
 *
 * @copyright
 * Copyright (c) 2015 by Semantic Press, Inc. All Rights Reserved.
 *
 * @license
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 *
 */

var Pony = require('pony-render'),
  fs = require('fs'),
  path = require('path'),
  util = require('util'),
  _ = require('lodash'),
  i18n = require('i18n'),
  rimraf = require('rimraf'),
  uuid = require('node-uuid'),
  colors = require('colors'),
  fields = require('fields'),
  pkgJson = require('../package.json'),
  conf = require('nconf'),
  parser = require("nomnom"),
  cpr = require('cpr').cpr,
  readdirp = require('readdirp'),
  mkdirp = require('mkdirp'),
  express = require('express'),
  fsmonitor = require('fsmonitor'),
  compression = require('compression'),
  AsciiBanner = require('ascii-banner'),
  launcher = require('browser-launcher2'),
  WebSocketServer = require('ws').Server,
  git = require('gift'),
  def = require('./default-input.js');


var ponypath = getUserHome()+'/.ponyshow';
var workspace = ponypath+'/workspace';

conf.use('file', { file: ponypath+'/config.json' });
conf.defaults({
  'theme': 'default',
  'port': 8080,
  'wsport': 8081
});
conf.load();

var Decks = [];
var wss = new WebSocketServer({ port: conf.get('wsport') });
var wsctx = false;


// set path.existsSync to make old modules designed for <=0.6 happy
path.existsSync = fs.existsSync || path.existsSync;

if (typeof exports === 'object' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function rmDir(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        rmDir(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function runExampleSlide(args) {
  process.exit(0);
}

function isOnline(cb) {
    require('dns').lookup('google.com',function(err) {
        if (err && err.code == "ENOTFOUND") {
            cb(false);
        } else {
            cb(true);
        }
    })
}

function promptForFile(args) {  
  options = [];
  for (var x in Decks) {
    options.push({id:parseInt(x)+1, meta:Decks[x]});
  }
  
  fields.select({
  	title: 'Found '+options.length+' presentations',
  	promptLabel: 'Choose a deck',
  	formatters: {
  		option: function (opt, idx, num) {
  			return opt.id + ')  ' + opt.meta.ponyfile.filename.cyan;
  		}
  	},
  	complete: true,
  	numbered: false,
  	relistOnError: true,
  	complete: ['id', 'name'],
  	completeIgnoreCase: true,
  	suggest: false,
  	optionLabel: 'name',
  	optionValue: 'id',
  	options: options
  }).prompt(function (err, i) {
  	if (err) {
  		process.stdout.write('\n');
  		process.exit(0);
  	} else {
  		renderFile(options[i-1].meta,start);
  	}
  });
  
}

function clearScreen(args) {
  // clear screen
  var lines = process.stdout.getWindowSize()[1];
  for(var i = 0; i < lines; i++) {
      console.log('\r\n');
  }
}

function renderFile(dp,_cb) {
  
  //console.log(dp);
  
  var file = dp.fullPath;
  
  if (dp.args['locale']) {
    // check if different from deck locale
    if (dp.args.locale != dp.ponyfile['locale']) {
      // modify source file to localized version based on command line args
      file = dp.fullParentDir+'/locales/'+dp.args['locale']+'.md';
    }
    
  }
  
  
  if (!fs.existsSync(file)) {
    
    // Prompt to create a lang file
    fields.text({
    	title: 'File doesn\'t exist for language "'+dp.args['locale']+'"',
    	promptLabel:'Create a new language file?',
    	default:"No",
    	validate: function (value, callback) {
  			callback(!value.length, value);
  		}
    }).prompt(function (err, val) {
    	if (err) {
    		process.stdout.write('\n');
    		process.exit(0);
    	} else {
    	  if (val != "No") {
    	    
    	    // create file
    	    fs.writeFileSync(file, fs.readFileSync(dp.fullPath));
    	    console.log('File created. You can now localize this file.');
    	    
    	  }
    	  
    	  process.exit(0);
    	}
    });
    
  } else {
    
    // Open file
    fs.readFile(file, 'utf8', function (err, str) {
      if (err) console.log(err);

      // Render content
      Pony = require('pony-render');

      // Get configuration file
      var dat = JSON.parse(fs.readFileSync(ponypath+'/config.json').toString());

      var html = Pony.render(str,dat);
      
      if (html) {

        // Save source contents
        fs.writeFile(workspace+'/index.html',html,{'flags': 'w+'},function(err){
          if (err) {
            throw err;
          } else {

            // Copy slide assets
            fs.exists(path.join(dp+'/assets'),function(exists){
              if (exists) {
                // copy assets over
                cpr(path.join(dp+'/assets'), workspace+'/assets', function (err) {
                 if (err) {
                   return console.error(err);
                 }
                });
              }
            });
            
            // Monitor file to detect change events
            fsmonitor.watch(path.dirname(dp.fullPath), null, function(change) {
              renderFile(dp, function() {
                if (wsctx) {
                  try{
                    wsctx.send("reload");
                  } catch(e) {
                    console.error(e);
                  }
                }
              });

            });

            // Start server
            if (typeof _cb == "function") {
              _cb(dp);
            }

          }            
        });
      } else {
        console.log('Error ponifying content');
        console.log(html);
      }

    });
    
  }
  
}

function start(dp) {  
  
  try {
    
    var app = express();
    var port = process.env.PORT || conf.get('port');
    
    // Serve workspace dir
    app.locals.pretty = true;
    app.use(compression());
    app.use("/", express.static(workspace, { maxAge: 0 }));
    app.listen(port);
  
    wss.on('connection', function connection(ws) {
      wsctx = ws;
      wsctx.send('Socket server is running');    
    });
  
    launcher(function (err, launch) {
        if (err) return console.error(err);      
        launch('http://127.0.0.1:'+port, launch.browsers[0].name, function (err, instance) {
            if (err) return console.error(err); 
            instance.on( 'stop', function( code ) {
              console.log( 'Browser stopped ('+code+')');
              process.exit(0);
            });
        });
    });
    
    clearScreen();
    
    var json = JSON.parse(fs.readFileSync(path.dirname(dp.fullPath)+'/package.json'));
    
    AsciiBanner
    .write('Pony Show')
    .color('yellow')
    .after('>v'+pkgJson.version, 'yellow')
    .after('Title: '+json.filename+' - '+json.title)
    .after('Description: '+json.description)
    .after('Author: '+json.author)
    .after('Localization: '+(dp.args['locale']||conf.locale), 'yellow')
    .after('')
    .after('http://127.0.0.1:'+port, 'yellow')
    .out();
      
  } catch (err) {
      console.error(err);
  }
  
}

function promptForNewSlide(args) {
  
  // detect if current dir is ponyfile
  readdirp({ root: workspace+'/themes', fileFilter: [ 'package.json' ] },function(entry) {}, function (err, res) {
    if (err) console.error(err);
    
    // Phrases
    var phrases = [
      'Enter a file name',
      'This will become a repository',
      'Enter slide location',
      'Enter the slide title',
      'Please enter a title',
      'Enter a description',
      'Available themes',
      'Select a theme',
      'Enter the git repository url',
      'Enter an author',
      'License'
    ];
    
    // for (var x in phrases) {
    //   i18n.__({phrase:phrases[x]})
    // }
        
    fields.text({
    	title: phrases[0],
    	desc: phrases[1],
    	validate: function (value, callback) {
  			callback(!value.length, value);
  		}
    }).prompt(function (err, _filename) {
    	if (err) {
    		process.stdout.write('\n');
    		process.exit(0);
    	} else {
    		
    		_filename = _filename.replace(' ','-');
    		
    		fields.set({

          path: fields.text({
        		promptLabel: phrases[2],
        		default:process.cwd()+"/"+_filename,
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	}),

        	title: fields.text({
        		promptLabel: phrases[3],
        		validate: function (value, callback) {
        			callback(!value.length && new Error(phrases[4]), value);
        		}
        	}),

        	description: fields.text({
        		promptLabel: phrases[5],
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	}),

        	theme: fields.select({
        	  title: phrases[6],
        		promptLabel: phrases[7],
        		formatters: {
          		option: function (opt, idx, num) {
          			return num + opt.parentDir.cyan;
          		}
          	},
        		numbered: true,
          	relistOnError: true,
          	complete: true,
          	suggest: false,
        		options: res.files,
        		complete: ['parentDir'],
          	optionLabel: 'parentDir',
          	optionValue: 'parentDir',
          	default:res.files[0].parentDir,
        		next: function (err, value, callback) {
        			return null;
        		}
        	}),
        	
        	locale: fields.text({
        	  title:'Default language',
        	  desc: 'ISO 3166-1 country codes (2 alpha)',
        	  default:conf.get('locale')
        	}),

        	repoUrl: fields.text({
        		promptLabel: phrases[8],
        		default:'http://',
        		validate: function (value, callback) {
        		  // verify url
        			callback(!value.length, value);
        		}
        	}),

        	author: fields.text({
        		promptLabel: phrases[9]
        	}),

        	license: fields.text({
        		promptLabel: phrases[10],
        		default:'MIT',
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	})

        }).prompt(function (err, value) {
        	if (err) {
        		process.stdout.write('\n');
        		console.error(err);
        	} else {

        		def.guid = uuid.v1();
        		def.repository.url = value.repoUrl;
        		
        		value.filename = _filename;

        		var pkg = _.merge(def,value);

        		var p = path.join(process.cwd(), _filename);
        		
        		// Create localization file
        		var keys = Object.keys(pkg);
        		for(var x in keys) {
        		  //i18n.__({phrase: pkg[x], locale: 'en'});
        		  i18n.__(keys[x]);
        		}

        		// create folder
        		mkdirp.sync(p);
        		mkdirp.sync(p+'/assets');
        		mkdirp.sync(p+'/locales');
        		
        		var defaultText = 'theme:'+pkg.theme+'\n\n#Welcome\n\n'+pkg.description+'\n\n---cover\n\n# '+pkg.title+'\n\n---\n\n# Slide 2\n\n---section\n\n# Welcome to Ponyshow\n\n---\n\n# Slide 4\n\n![](http://placehold.it/600x100)\n\n- This is a list\n- So is this';

        		// write pkg
        		fs.writeFileSync(p+'/package.json',JSON.stringify(pkg, null, '\t'));
        		fs.writeFileSync(p+'/deck.md',defaultText);
            
            // write locale
            if (conf.get('locale') != value.locale) {
              fs.writeFileSync(p+'/locales/'+conf.get('locale')+'.md',defaultText);
            }
            
        		console.log('Slide is ready. Now start Ponyshow and run the slide..');

        	}

          process.exit(0);

        });
        
    	}
    });
    

    
  });
  
}

function runFirstRun(args) {
  
  clearScreen();
  
  console.log('\nHowdy partner. Welcome to Ponyshow!\n'.white);
  
  console.log('You can read the docs here: http://www.ponyshow.com/docs'.yellow);
  
  console.log('Or, install an example deck by running:'.yellow);
  console.log('\npony run example'.grey);
  console.log('\nThere are other commands you can run, so fee free to go wild.');
  console.log('Email me if you have any questions at martin@semanticpress.com');
  console.log('\n(Run pony again to continue)'.grey);
  console.log('\nGiddyup!');
  
  process.exit(0);
  
}


var Module = function Class(_opts) {
  
  this.installed = false;
  
  this.callee = _opts.callee;
  
  // set global fields configuration
  fields.setup({
    colors:true,
  	formatters: {
  		error: function (err) {
  			if (err instanceof Error) {
  				return ('[ERROR] ' + err.message).red + '\n';
  			}
  			err = '' + err;
  			return '\n' + (/^(\[ERROR\])/i.test(err) ? err : '[ERROR] ' + err.replace(/^Error\:/i, '').trim()).red;
  		}
  	}
  });


  // locale config
  i18n.configure({
      // setup some locales - other locales default to en silently
      locales:['en', 'es', 'it', 'de', 'fr', 'sv', 'nl', 'jp', 'cn' ],

      // you may alter a site wide default locale
      defaultLocale: 'en',

      // sets a custom cookie name to parse locale settings from  - defaults to NULL
      cookie: 'ponyshowrocks',

      // where to store json files - defaults to './locales' relative to modules directory
      directory: path.join(__dirname, 'locales'),

      // whether to write new locale information to disk - defaults to true
      updateFiles: true,

      // enable object notation
      objectNotation: true
  });
  
  i18n.setLocale(conf.get('locale'));


  // check that we're using Node.js 0.10 or newer
  try {
  	if (semver.lt(process.version, '0.10.0')) {
  		console.error(pkgJson.about.name.cyan.bold + ', CLI version ' + pkgJson.version + '\n' + pkgJson.about.copyright + '\n\n' +
  			'ERROR: Titanium requires Node.js 0.10 or newer.'.red + '\n\n' +
  			'Visit ' + 'http://nodejs.org/'.cyan + ' to download a newer version.\n');
  		process.exit(1);
  	}
  } catch (e) {}
  
}


Module.prototype.init = function (_opts) {
  
  var self = this;
  
  process.env.locale = "en_US";
  
	// strip the node executable from the args
	var args = process.argv.slice();
	if (args[0].replace(/\\/g, '/').split('/').pop().replace(/\.exe$/, '') == process.execPath.replace(/\\/g, '/').split('/').pop().replace(/\.exe$/, '')) {
		args.shift();
	}
		
	args.shift();


  // Run command line parser
  parser.script('pony');

  parser.command('version')
    .callback(this.version).help('display version');
  parser.command('new')
    .callback(this.new).help("new presentation");
  parser.command('run')
    .callback(this.run).help("run a presentation file(s)");
  parser.command('install')
    .callback(this.install).help("install themes and projects");
  parser.command('config')
    .callback(this.config).help("Get or set global settings");
  parser.option('locale', { abbr: 'l', flag: true, help: 'Set localization country code'});

  
  // Set install state
  if (!fs.existsSync(ponypath)) {
    self.firstrun = true;
  }

  // Ensure ponypath and workspace are installed
  mkdirp.sync(ponypath);
  mkdirp.sync(ponypath+'/workspace');
  
  // Create config if not avail
  if (!fs.existsSync(ponypath+'/config.json')) {
    fs.writeFileSync(ponypath+'/config.json', fs.readFileSync(path.join(__dirname,'../config.json')));
  }
  
  // synchronize workspace assets
  cpr(path.join(__dirname,'../workspace'), workspace, function (err, files) {
    if (err) {
      return console.error(err);
    }
    
    if (self.firstrun) {
      self.firstrun = false;
      runFirstRun();
    } else {
      parser.parse();
    }
    
  });
  	
};

Module.prototype.config = function(_opts) {

  if (_opts['_'].length <= 1) {
    console.log('\nSettings:'.cyan);
    var data = fs.readFileSync(ponypath+'/config.json');
    console.dir(JSON.parse(data.toString()));
    process.exit(0);
  } else {
    
    if(_opts['_'].length == 2) {
      console.log('Nothing to set');
      process.exit(0);
    } else {
      
      var args = _opts['_'][2].split('=');
      
      conf.set(args[0], args[1]);
      
      switch(args[0]) {
        case 'locale':
          i18n.setLocale(args[1]);
          break;
      }
      
      conf.save(function (err) {
        if (err) { return console.error(err.message) };
        console.log('Config was updated successfully');
        process.exit(0);
      });
      
    }
    
  }
  
};

Module.prototype.install = function(_opts, _cb) {
  
  
  if (_opts['_'].length <= 1) {
    console.log('\nMissing argument for install.'.red);
    
    fields.select({
       title: 'Available commands',
       complete: true,
       numbered: false,
       options: ['theme']
     }).prompt(function (err, i) {
       process.exit(0);
     });
     process.exit(0);
  } else {
    
    if (_opts[1] == "theme") {
      
      if (!_opts[2]) {
        console.log('\nYou must specify a repository url'.red);
        console.log('\nUsage: ');
        console.log('\n pony install theme http://path/to/git/repo');
        process.exit(0);
        return;
      }
      
      // install from url
      var url = _opts[2];
      var name = path.basename(url).split('.')[0].replace('theme-','');

      rimraf(workspace+'/themes/'+name, function(){
                
        git.clone(url, workspace+'/themes/'+name, function(err, _repo){
          if (err) {
            console.error(err);
          } else {
            console.log('Theme installed: '+_repo.path);
          }
          process.exit(0);

        });
        
      });
      
    }
    
  }
   
};

Module.prototype.new = function(_opts, _cb) {
  
  //console.log(_opts['_']);
    
  // Run command line field inputs
  try {
    
    if (_opts['_'].length >= 2) {
      
      if (_opts['_'][1] == "slide") {
        promptForNewSlide();
      }      
      
    } else {
      console.log('\nNothing to create');
      fields.select({
         title: 'Available commands',
         complete: true,
         numbered: false,
         options: ['slide']
       }).prompt(function (err, i) {
         process.exit(0);
       });
       process.exit(0);
    }
    
  }catch(e) {
    console.error('There was an error!\n' + e);
  }
  
}

Module.prototype.run = function(_opts) {
  
    //console.log(_opts);
    
    if (_opts[1] == "example") {
      runExampleSlide();
      return;
    }

    var dest = process.cwd()+(_opts[1] ? '/'+_opts[1] : '');
    
    // detect if current dir is ponyfile
    readdirp({ root: dest, fileFilter: [ 'deck.md' ] },function(entry) {
      
      try {
          entry.ponyfile = JSON.parse(fs.readFileSync(entry.fullParentDir+'/package.json'))
      } catch (err) {
          console.error(err);
      }
      
    }, function (err, res) {
      
      if (!res) {
        if (dest)
        console.error('Doesn\'t exist: '+dest);
        process.exit(0);
        return false;
      }
      
      Decks = res.files;
      
      // Attempt to sort decks array. Alphanumeric may not be consistent
      Decks.sort(function(a, b) {
        return a.ponyfile.filename.localeCompare(b.ponyfile.filename);
      });
            
      if (Decks.length > 0) {

        if (Decks.length > 1) {
          // Show selector
          promptForFile();

        } else {
          
          // stash commands for future deck functions
          Decks[0].args = _opts||{};
          
          // Render file
          renderFile(Decks[0],start);
        }

      } else {
        
        console.log('No decks found from this path');
        process.exit(0);
      }
      
    });

}

Module.prototype.version = function() {
  console.log('version '+pkgJson.version);
  process.exit(0);
}



define(function (require, exports, module) {
    module.exports = function() {
      if(require.main === module) { 
        // called directly
        var Pony = new Module({
          callee:'cli'
        });
        Pony.init();
      } else { 
        // required as a module
        var Pony = new Module({
          callee:'module'
        });
        Pony.init();
      }      
    }();
});