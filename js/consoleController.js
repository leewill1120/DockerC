const electron = nodeRequire('electron');
const pty = nodeRequire('pty.js');
const ipcRenderer = electron.ipcRenderer;

var myApp = angular.module('myApp',[]);

myApp.controller('consoleController', function($scope){
	$scope.quit = function(){
		window.close();
	};


  var term_backend = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.PWD,
    env: process.env
  });

	var terminalContainer = document.getElementById('terminal-container');

	createTerminal();

  term_backend.on('data', function(data) {
    try {
      term.write(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });

	function createTerminal() {
	  while (terminalContainer.children.length) {
	    terminalContainer.removeChild(terminalContainer.children[0]);
	  }
	  term = new Terminal({
	    cursorBlink: optionElements.cursorBlink.checked
	  });
	  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
	  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/bash';
	  socket = new WebSocket(socketURL);

	  term.open(terminalContainer);
	  term.fit();

	  socket.onopen = runRealTerminal;
	  socket.onclose = runFakeTerminal;
	  socket.onerror = runFakeTerminal;
	}
	function runFakeTerminal() {
	  if (term._initialized) {
	    return;
	  }

	  term._initialized = true;

	  var shellprompt = '$ ';

	  term.prompt = function () {
	    term.write('\r\n' + shellprompt);
	  };

	  term.writeln('Welcome to xterm.js');
	  term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
	  term.writeln('Type some keys and commands to play around.');
	  term.writeln('');
	  term.prompt();

	  term.on('key', function (key, ev) {
	    var printable = (
	      !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
	    );

	    if (ev.keyCode == 13) {
	      term.prompt();
	    } else if (ev.keyCode == 8) {
	      /*
	     * Do not delete the prompt
	     */
	      if (term.x > 2) {
	        term.write('\b \b');
	      }
	    } else if (printable) {
	    	term_backend.write(key);
	      term.write(key);
	    }
	  });

	  term.on('paste', function (data, ev) {
	    term.write(data);
	  });
	}
	runFakeTerminal();
});