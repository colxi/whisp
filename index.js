process.stdout.write( '\033c' );  

// hardcoded command line parameters (for repl.it)
// process.argv = ['','', '-port=6666','-ssl=false']

require('./server/server.js');
