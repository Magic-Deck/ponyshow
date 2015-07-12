var spawn = require( 'child_process' ).spawn;

var browsers = {
		'google-chrome': {
			name: 'chrome',
			re: /Google Chrome (\S+)/,
			type: 'chrome',
			profile: true,
		}
};

function check(name, callback) {
  var process = spawn( name, [ '--version' ] ),
  	re = browsers[ name ].re,
  	data = '';

  process.stdout.on( 'data', function( buf ) {
  	data += buf;
  } );

  process.on( 'error', function() {
  	callback( 'not installed' );
  	callback = null;
  } );

  process.on( 'exit', function( code ) {
  	if ( !callback ) {
  		return;
  	}

  	if ( code !== 0 ) {
  		return callback( 'not installed' );
  	}

  	var m = re.exec( data );

  	if ( m ) {
  		callback( null, m[ 1 ] );
  	} else {
  		callback( null, data.trim() );
  	}
  } );
}


check( 'google-chrome', function( err, v, p ) {
  if (err) return console.log(err);
  
  console.log(v);
});