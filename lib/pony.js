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
 	conf = require('nconf'),
 	parser = require("nomnom"),
 	writeFile = require('write'),
 	ncp = require('ncp').ncp,
 	readdirp = require('readdirp'),
 	express = require('express'),
 	fsmonitor = require('fsmonitor'),
 	compression = require('compression'),
 	AsciiBanner = require('ascii-banner'),
 	launcher = require('browser-launcher2'),
 	WebSocketServer = require('ws').Server,
 	git = require('gift'),
 	def = require('./default-input.js');


conf.use('file', { file: './config.json' });
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

function renderFile(dp,_cb) {
  
  fs.readFile(dp.fullPath, 'utf8', function (err, str) {
    if (err) throw err;
    
    // Render content
    Pony = require('pony-render');
    
    // Get configuration file
    var dat = JSON.parse(fs.readFileSync('./config.json').toString());
    
    var html = Pony.render(str,dat);
    
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
            _cb(path.dirname(dp.fullPath));
          }
          
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
  var port = process.env.PORT || conf.get('port');
  
  // Serve workspace dir
  app.use(compression());
  app.use("/", express.static(workspace, { maxAge: oneDay }));
  app.listen(port);
  
  wss.on('connection', function connection(ws) {
    wsctx = ws;
    wsctx.send('Socket server is running');    
  });
  
  launcher(function (err, launch) {
      if (err) return console.error(err);      
      launch('http://127.0.0.1:'+port, launch.browsers[0].name, function (err, instance) {
          if (err) return console.error(err); 
      });
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
  
  parser.command('install').callback(this.install)
    .help("install themes and projects");
  
  parser.command('config').callback(this.config)
    .help("Get or set global settings");
    
  parser.parse();
	
};

Module.prototype.config = function(_opts) {

  if (_opts['_'].length <= 1) {
    console.log('\nSettings:');
    var data = fs.readFileSync('./config.json');
    console.dir(JSON.parse(data.toString()));
    process.exit(0);
  } else {
    
    if(_opts['_'].length == 2) {
      console.log('Nothing to set');
      process.exit(0);
    } else {
      
      var args = _opts['_'][2].split('=');
      
      conf.set(args[0], args[1]);
      
      conf.save(function (err) {
        if (err) { return console.error(err.message) };
        console.log('Config was updated successfully');
        process.exit(0);
      });
      
    }
    
  }
  
};

Module.prototype.install = function(_opts, _cb) {
    
  if (_opts.length == 2) {
    switch(_opts[1]) {
      case 'theme':
      
      // Load themes
        
        fields.select({
           title: 'Select a theme',
           complete: true,
           numbered: false,
           relistOnError: true,
           complete: ['id', 'name'],
           completeIgnoreCase: true,
           suggest: false,
           optionLabel: 'name',
           optionValue: 'id',
           options: [{id:1,name:'Appcelerator'},{id:2,name:'Deckset'}]
         }).prompt(function (err, i) {
           if (err) {
             process.stdout.write('\n');
             process.exit(0);
           } else {
             console.log(i);
           }
           process.exit(0);
         });
        
        break;
    }
  }
  
  if (_opts[1] == "theme") {
    // install frm url
    var url = _opts[2];
    var name = path.basename(url).split('.')[0].replace('theme-','');
    
    // remove dir
    rmDir(path.join('workspace/themes',name));
    
    git.clone(url, path.join('workspace/themes',name), function(err, _repo){
      if (err) return console.log(err);
      
      console.log('Theme installed: '+_repo.path);
      process.exit(0);
      
    });
  }
   
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
          renderFile(Decks[0],start);
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