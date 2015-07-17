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
  request = require('request'),
  zlib = require('zlib'),
  path = require('path'),
  util = require('util'),
  _ = require('lodash'),
  tar = require('tar'),
  replaceStream = require('replacestream'),
  i18n = require('i18n'),
  rimraf = require('rimraf'),
  uuid = require('node-uuid'),
  prettyjson = require('prettyjson'),
  colors = require('colors'),
  fields = require('fields'),
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
  pkgJson = require('../package.json'),
  Spinner = require('./spinner').Spinner;


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
var spinnerctx = false;


// set path.existsSync to make old modules designed for <=0.6 happy
path.existsSync = fs.existsSync || path.existsSync;

if (typeof exports === 'object' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}

function onError(err) {
  console.error('\nAn error occurred:', err);
  process.exit(0);
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

function banner(json) {
  json = json||{banner:'small'};
  
  // support: https://github.com/Marak/asciimo

  var out = AsciiBanner.write('Pony Show');
  
  if (json.font) {
    out.font(json.font);
  }
    
  switch(json.banner) {
    case 'large':
      out
        .color('yellow')
        .after('>v'+pkgJson.version, 'yellow');
      
      break;
    
    case 'small':
      out
        .color('yellow')
        .after('>v'+pkgJson.version, 'yellow');
        
      break;
  }
  return out;
  
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
  if (spinnerctx) {
    spinnerctx.setText('%s Rendering');
  }
  
  var file = dp.fullPath;
  
  if (dp.args) {
    // check if different from deck locale
    if (dp.args.hasOwnProperty('locale')) {
      if (dp.args.locale != dp.ponyfile['locale']) {
        // modify source file to localized version based on command line args
        file = dp.fullParentDir+'/locales/'+dp.args['locale']+'.md';
      } 
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
    
    // Open deck.md file
    fs.readFile(file, 'utf8', function (err, str) {
      if (err) console.log(err);

      // Render content
      Pony = require('pony-render');

      // Get configuration file
      var dat = JSON.parse(fs.readFileSync(ponypath+'/config.json').toString());

      var html = Pony.render(str,dat);
      
      if (html) {
        
        html = "<!-- \n\nPonyshow v"+pkgJson.version+"\nThis file is autogenerated.\nCaution: Edits will not be saved\n\n-->\n\n"+html;

        // Save source contents
        fs.writeFile(workspace+'/index.html',html,{'flags': 'w+'},function(err){
          if (err) {
            throw err;
          } else {
     
            var target1 = path.dirname(dp.fullPath)+'/assets';
            var target2 = workspace+'/assets';
            
            // Copy slide assets if avail
            if(fs.existsSync(target1)) {
              // copy assets over
              cpr(target1, target2, function (err) {
               if (err) {
                 return console.error(err);
               }
              });
            };
            
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
    
    if (spinnerctx) {
      spinnerctx.stop(true);
    }
    
    // Get slide meta
    var json = JSON.parse(fs.readFileSync(path.dirname(dp.fullPath)+'/package.json'));
        
    // Set locale
    json.locale = (dp.args['locale']) ? dp.args['locale'] : conf.get('locale');
    
    // Display details
    console.log
    console.log('Title: '+json.filename+' - '+json.title)
    console.log('Description: '+json.description)
    console.log('Author: '+(json.author||"n/a"))
    console.log(String('Localization: '+json.locale).yellow)
    console.log('')
    console.log(String('http://127.0.0.1:'+port).yellow);
      
  } catch (err) {
      console.error(err);
  }
  
}

function createDefaultDeck(args) {
  
  // Get defaults
  var def = require('./default-slide.js');

	def.guid = uuid.v1();
	def.repository.url = value.repoUrl;

	value.title = title;
	value.filename = folder;

	var pkg = _.merge(def,value);

	var p = path.join(process.cwd(), folder);

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
}

function promptForNewSlide(args) {
  
  // detect if current dir is ponyfile
  readdirp({ root: workspace+'/themes', fileFilter: [ 'package.json' ] },function(entry) {}, function (err, res) {
    if (err) console.error(err);
    
    // Phrases
    var phrases = [
      '\nSlide title',
      'This will become a repository',
      '\nEnter slide location',
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
      title:phrases[0],
    	promptLabel: '',
    	validate: function (value, callback) {
  			callback(!value.length, value);
  		}
    }).prompt(function (err, _title) {
    	if (err) {
    		process.stdout.write('\n');
    		process.exit(0);
    	} else {
    		
    		var title = _title;
    		var folder = title.replace(' ','-').toLowerCase();
    		
    		fields.set({

          path: fields.text({
            title:phrases[2],
        		promptLabel: '',
        		default:process.cwd()+"/"+folder,
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	}),

        	description: fields.text({
        	  title:phrases[5],
        		promptLabel: '',
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	}),

        	theme: fields.select({
        	  title: phrases[6],
        	  desc:phrases[7],
        		promptLabel: '',
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
        	  promptLabel:'',
        	  desc: 'ISO 3166-1 country codes (2 alpha)',
        	  default:conf.get('locale')
        	}),

        	repoUrl: fields.text({
        	  title:phrases[8],
        		promptLabel: '',
        		default:'http://',
        		validate: function (value, callback) {
        		  // verify url
        			callback(!value.length, value);
        		}
        	}),

        	author: fields.text({
        	  title:phrases[9],
        		promptLabel: ''
        	}),

        	license: fields.text({
        	  title:phrases[10],
        		promptLabel: '',
        		default:'MIT',
        		validate: function (value, callback) {
        			callback(!value.length, value);
        		}
        	})

        }).prompt(function (err, value) {
        	if (err) {
        		process.stdout.write('\n');
        		console.log('Goodbye!');
        	} else {
        	  
        	  spinnerctx = new Spinner('%s Processing');
            spinnerctx.setSpinnerString('|/-\\');
            spinnerctx.start();
        	  
        	  // Set values
        	  value.guid = uuid.v1();
          	value.title = title;
          	value.filename = folder;
            
            // Check if online
            isOnline(function(online) {
              
              if (online) {
                
                // Set req options
                var opts = {
                  url: 'https://api.github.com/repos/ponyshow/deck-default/releases/latest',
                  headers: {
                    'User-Agent': 'request'
                  }
                };

                spinnerctx.setText('%s Downloading default deck');
                
                // Get latest default theme
                request.get(opts, function (error, response, body) {
                  if (!error && response.statusCode == 200) {

                    var json = JSON.parse(body);

                    // Set download url
                    opts.url = json.tarball_url;
                    
                    // Set filesystem target
                    var target = path.join(process.cwd(), folder);

                    // Download and extract
                    // Note: Github tarballs are gzip-compressed
                    request.get(opts)
                      .pipe(zlib.Unzip()).pipe(tar.Extract({path:target,strip: 1}))
                      .on('end',function() {

                        // update default
                        spinnerctx.setText('%s Merging properties');
                        

                        // Replace all the instances
                        var fsdeck = path.join(target, '.deck');
                        var fspkg = path.join(target, 'package.json');

                        var read1 = fs.createReadStream(fsdeck)
                          .pipe(replaceStream('<%= title %>', value.title))
                          .pipe(replaceStream('<%= description %>', value.description))
                          .pipe(replaceStream('<%= theme %>', value.theme))
                          .pipe(fs.createWriteStream(path.join(target, 'deck.md')));
                        
                        read1.on("finish", function() {
                          
                          var json = JSON.parse(fs.readFileSync(fspkg, 'utf8'));
                          json.repository.url = value.repoUrl;
                          
                          fs.writeFileSync(fspkg, JSON.stringify(_.merge(json,value), null, '\t'));

                          spinnerctx.stop(true);
                          fs.unlinkSync(fsdeck);

                          console.log('Slide is ready. Now start Ponyshow and run the slide..');
                          process.exit(0);
                        });


                      });

                  } else {
                    console.log('Error fetching url: '+opts.url);
                    process.exit(0);
                  }
                });

                
              } else {
                
                console.log('Not online');
                process.exit(0);
              }
              
            });

        	}

        });
        
    	}
    });
    

    
  });
  
}

function promptForNewTheme(args) {

	fields.set({
    title: fields.text({
      title: '\nTheme title',
      promptLabel: '',
      validate: function (value, callback) {
  			callback(!value.length, value);
  		}
    }),
    
  	description: fields.text({
  	  title:'Description',
  		promptLabel: ''
  	}),
  	
  	author: fields.text({
  	  title:'Author',
  		promptLabel: ''
  	}),
  	
  	license: fields.text({
  	  title:'License',
  		promptLabel: '',
  		default:'MIT',
  		validate: function (value, callback) {
  			callback(!value.length, value);
  		}
  	})
  }).prompt(function (err, value) {
  	if (err) {
  		process.stdout.write('\n');
  		process.exit(0);
  	} else {
  	  
  	  spinnerctx = new Spinner('%s Processing');
      spinnerctx.setSpinnerString('|/-\\');
      spinnerctx.start();

  	  var pre = 'ponyshow-theme-';
    	var name = value.title||'';
    	var folder = name.replace(' ','-').toLowerCase();
  	      	
  	  var def = require('./default-theme.js');
  	  
  	  // Prepend name convention for npm purposes
  	  value.name = pre+name;
  
      rimraf(workspace+'/themes/'+name, function(){
        
        isOnline(function(online) {
          
          if (online) {
            
            var opts = {
              url: 'https://api.github.com/repos/ponyshow/theme-default/releases/latest',
              headers: {
                'User-Agent': 'request'
              }
            };
            
            spinnerctx.setText('%s Downloading latest theme');
            
            // Get latest default theme
            request.get(opts, function (error, response, body) {
              if (!error && response.statusCode == 200) {

                var json = JSON.parse(body);
                
                // Set download url
                opts.url = json.tarball_url;
                
                var target = workspace+'/themes/'+folder;
                
                // Download and extract
                // Note: Github tarballs are gzip-compressed
                request.get(opts)
                  .pipe(zlib.Unzip()).pipe(tar.Extract({path:target,strip: 1}))
                  .on('end',function() {
                  
                    // update default
                    spinnerctx.setText('%s Merging properties');
                  
                    // Replace all the instances
                    var fscopyright = path.join(target, '.copyright');
                    var fslicense = path.join(target, '.license');
                    var fsreadme = path.join(target, '.readme');
                    var fspkg = path.join(target, 'package.json');
                  
                    var read1 = fs.createReadStream(fscopyright)
                      .pipe(replaceStream('<%= author %>', value.author))
                      .pipe(replaceStream('<%= version %>', value.version))
                      .pipe(fs.createWriteStream(path.join(target, 'Copyright')));
                  
                    var read2 = fs.createReadStream(fslicense)
                      .pipe(replaceStream('<%= author %>', value.author))
                      .pipe(fs.createWriteStream(path.join(target, 'LICENSE.md')));

                    var read3 = fs.createReadStream(fsreadme)
                      .pipe(replaceStream('<%= name %>', value.author))
                      .pipe(fs.createWriteStream(path.join(target, 'README.md')));
                                        
                    read3.on("finish", function() {
                      
                      var json = JSON.parse(fs.readFileSync(fspkg, 'utf8'));    
                      fs.writeFileSync(fspkg, JSON.stringify(_.merge(json,value), null, '\t'));
                    
                      spinnerctx.stop(true);
                      fs.unlinkSync(fscopyright);
                      fs.unlinkSync(fslicense);
                      fs.unlinkSync(fsreadme);
                      
                      console.log('Theme created!\n')
                      console.log('  Theme: '.yellow+name);
                      console.log('  Location: '.yellow+target);
                      console.log('\n  Tip: You can run \'ponyshow themes\' to see installed themes'.grey);
                      
                      process.exit(0);
                    });

                  
                  });
                
              } else {
                console.log('Error fetching url: '+opts.url);
                process.exit(0);
              }
            });
            
          } else {
            
            console.log('Sorry, not online. You must have internet access to remote themes.');
            process.exit(0);
            
          }

          
        });        
        
      });
      
	  }
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

function runNewCommand(opt) {
  switch(opt) {
    case "slide":
      promptForNewSlide();
      break;
    case "theme":
      promptForNewTheme();
      break;
  }
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
  
  clearScreen();
  
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
  mkdirp.sync(ponypath+'/tmp');
  mkdirp.sync(ponypath+'/workspace');
  
  // Create config if not avail
  if (!fs.existsSync(ponypath+'/config.json')) {
    fs.writeFileSync(ponypath+'/config.json', fs.readFileSync(path.join(__dirname,'../config.json')));
  }
  
  // synchronize workspace assets
  cpr(path.join(__dirname,'../workspace'), workspace, function (err, files) {
    if (err) {
      return console.log('Goodbye!');
    }
    
    if (self.firstrun) {
      self.firstrun = false;
      runFirstRun();
    } else {
      banner().out(function() {
        parser.parse();
      });
    }
    
  });
  	
};

Module.prototype.config = function(_opts) {
  
  var self = this;
  
  if (_opts['_'].length <= 1) {
    
    var data = JSON.parse(fs.readFileSync(ponypath+'/config.json'));
    console.log(prettyjson.render({Settings:data},{
      keysColor: 'yellow',
      stringColor: 'white'
    }));
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
  
  clearScreen();
  
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
     
  var options = [
    'slide',
    'theme'
  ];
  
  // Run command line field inputs
  try {
    
    if (_opts['_'].length >= 2) {
      
      runNewCommand(_opts['_'][1]);
      
    } else {
      fields.select({
         title: '\nAvailable options..'.yellow,
         desc: '(This will bootstrap a new component)',
         promptLabel:'\nSelect an option',
         complete: true,
         numbered: true,
         options: options
       }).prompt(function (err, i) {
         runNewCommand(i);
       });
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
          // stash commands for future deck functions
          entry.args = _opts||{};
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