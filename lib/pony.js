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

var fs = require('fs'),
 	path = require('path'),
 	util = require('util'),
 	Pony = require('pony-render'),
 	colors = require('colors'),
 	fields = require('fields'),
 	pkgJson = require('../package.json'),
 	parser = require("nomnom"),
 	writeFile = require('write'),
 	ncp = require('ncp').ncp,
 	readdirp = require('readdirp'),
 	express = require('express'),
 	fsmonitor = require('fsmonitor'),
 	compression = require('compression'),
 	AsciiBanner = require('ascii-banner'),
 	def = require('./default-input.js');
 	

var Decks = [];

// set path.existsSync to make old modules designed for <=0.6 happy
path.existsSync = fs.existsSync || path.existsSync;

if (typeof exports === 'object' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}

var Module = function Class(_opts) {
  
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
  		renderFile(options[i-1].meta);
  	}
  });
  
}

function renderFile(dp) {
      
  fs.readFile(dp.fullPath, 'utf8', function (err, dat) {
    if (err) throw err;
    
    // Render content

    var html = Pony.render(dat);
    
    if (html) {

      // Save source contents
      fs.writeFile(path.join(__dirname,'../workspace/index.html'),html,{'flags': 'w+'},function(err){
        if (err) {
          throw err;
        } else {
          
          // Copy slide assets
          fs.exists(path.join(dp+'/assets'),function(exists){
            if (exists) {
              // copy assets over
              ncp(path.join(dp+'/assets'), path.join(__dirname,'../workspace/assets'), function (err) {
               if (err) {
                 return console.error(err);
               }
              });
            }
          });
          
          // Start server
          start(path.dirname(dp.fullPath));
        }            
      });
    } else {
      console.log('Error ponifying content');
      console.log(html);
    }

  });
  
}

function start(dest) {
  
  var workspace = path.join(__dirname,'../workspace');
  var app = express();
  var oneDay = 86400;
  var port = process.env.PORT || 8080;
  app.use(compression());
  
  // Serve workspace dir
  app.use("/", express.static(workspace, { maxAge: oneDay }));
  app.listen(port);
  
  // Monitor workspace to detect change events
  fsmonitor.watch(workspace, null, function(change) {    
    
  });
  
  try {
    
      // clear screen
      var lines = process.stdout.getWindowSize()[1];
      for(var i = 0; i < lines; i++) {
          console.log('\r\n');
      }
      
      var json = JSON.parse(fs.readFileSync(dest+'/package.json'));
      
      AsciiBanner
      .write('Pony Show')
      .color('yellow')
      .after('>v{{version}}', 'yellow')
      .after(json.filename+' - '+json.title)
      .after(json.description)
      .after('http://127.0.0.1:'+port, 'yellow')
      .out();
      
  } catch (err) {
      console.error(err);
  }
  
}



Module.prototype.init = function (_opts) {
  
  process.env.locale = "en_US";
  
	// strip the node executable from the args
	var args = process.argv.slice();
	if (args[0].replace(/\\/g, '/').split('/').pop().replace(/\.exe$/, '') == process.execPath.replace(/\\/g, '/').split('/').pop().replace(/\.exe$/, '')) {
		args.shift();
	}
		
	args.shift();
	
  
  
  // Run command line parser
  parser.command('version').callback(function() {
    console.log(pkgJson.version);
  }).help('display version');
  
  parser.command('create').callback(this.create)
    .help("create pony file");

  parser.command('run').callback(this.run)
    .help("run pony file");
  
      
  parser.parse();
	
};

Module.prototype.create = function(_opts, _cb) {
    
  if (this.callee == "module") {
    // loaded from module
    
  } else {
    
    // Run command line field inputs
    try {
      
      console.log('Sorry not implemented yet');
      
    }catch(e) {
      console.error('There was an error!\n' + e);
    }
    
  }
  
}


Module.prototype.run = function(_opts) {
      
    var dest = process.cwd()+(_opts[1] ? '/'+_opts[1] : '');
    
    // detect if current dir is ponyfile
    readdirp({ root: dest, fileFilter: [ 'deck.md' ] },function(entry) {
      
      try {
          entry.ponyfile = JSON.parse(fs.readFileSync(entry.fullParentDir+'/package.json'))
      } catch (err) {
          console.error(err);
      }
      
    }, function (err, res) {
      
      if (!res) return console.error('Unable to search: '+dest);
      
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
          renderFile(Decks[0]);
        }

      }
      
    });

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