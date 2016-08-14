const electron = nodeRequire('electron');
const URL = nodeRequire('url');
const http = nodeRequire('http');
const Docker = nodeRequire('dockerode');
const fs = nodeRequire('fs');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;

var myApp = angular.module('myApp', []);

myApp.controller('consoleController', function($scope) {

    $scope.createTerminal = function(terminalContainer) {
        while (terminalContainer.children.length) {
            terminalContainer.removeChild(terminalContainer.children[0]);
        }
        return new Terminal({
            cursorBlink: true
        });
    };

    $scope.runRealTerminal = function(term, socket) {
        term.writeln('Welcome to iDC container console.');
        term.writeln('');
        term.attach(socket);
        term._initialized = true;
    };

    $scope.runFakeTerminal = function(term) {
        if (term._initialized) {
            return;
        }

        term._initialized = true;

        var shellprompt = '$ ';

        term.prompt = function() {
            term.write('\r\n' + shellprompt);
        };

        term.writeln('Welcome to iDC container console.');
        term.writeln('');
        term.prompt();

        term.on('key', function(key, ev) {
            var printable = (!ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey);

            if (ev.keyCode == 13) {
                term.prompt();
                term.destroy();
                $scope.connectContainer();
            } else if (ev.keyCode == 8) {
                /*
                 * Do not delete the prompt
                 */
                if (term.x > 2) {
                    term.write('\b \b');
                }
            } else if (printable) {
                term.write(key);
            }
        });

        term.on('paste', function(data, ev) {
            term.write(data);
        });
    };

    /*初始化开始*/
    var docker = undefined;
    $scope.connectStatus = '未连接';
    $scope.dockerIP = localStorage.dockerIP;
    $scope.headerColor = localStorage.headerColor;
    $scope.dockerPort = parseInt(localStorage.dockerPort);
    $scope.containerId = URL.parse(document.URL, true).query.containerId;

    //创建docker实例
    if ("" == localStorage.dockerIP || "" == localStorage.dockerPort) {
        $scope.APIAddress = "";
    } else {
        $scope.APIAddress = `${localStorage.dockerIP}:${localStorage.dockerPort}`;
        if ("true" == localStorage.enableTLS) {
            docker = new Docker({
                host: localStorage.dockerIP,
                port: localStorage.dockerPort,
                ca: fs.readFileSync(`${__dirname}/../certificate/ca.pem`),
                cert: fs.readFileSync(`${__dirname}/../certificate/cert.pem`),
                key: fs.readFileSync(`${__dirname}/../certificate/key.pem`)
            });
        } else {
            docker = new Docker({ host: localStorage.dockerIP, port: localStorage.dockerPort });
        }
    }
    /*初始化完成*/

    $scope.connectContainer = function() {
        $scope.connectStatus = '正在连接...';
        var terminalContainer = document.getElementById('terminal-container');
        var term = $scope.createTerminal(terminalContainer);
        term.open(terminalContainer);
        term.fit();

        //获取容器实例,exec实例，启动exec实例
        var container = docker.getContainer($scope.containerId);
        container.inspect(function(err, data) {
            if (err) {
                $scope.runFakeTerminal(term);
                term.writeln(err.message);
                $scope.connectStatus = '未连接';
                return;
            }

            $scope.containerInfo = data;
            $scope.$apply();

            var execArgs = {
                "User": "",
                "Privileged": false,
                "Tty": true,
                "AttachStdin": true,
                "AttachStderr": true,
                "AttachStdout": true,
                "Detach": false,
                "DetachKeys": "",
                "Cmd": ["bash"]
            };
            container.exec(execArgs, (err, exec) => {
                if (!err) {
                    //启动exec实例
                    var options = {
                        hostname: localStorage.dockerIP,
                        port: localStorage.dockerPort,
                        path: `/exec/${exec.id}/start`,
                        method: 'POST',
                        headers: {
                            Connection: 'Upgrade',
                            Upgrade: 'tcp',
                            'Content-Type': 'application/json'
                        }
                    };

                    var reqData = {
                        Tty: true,
                        Detach: false
                    };

                    var req = http.request(options);
                    req.on('error', (e) => {
                        console.log(`problem with request: ${e.message}`);
                    });

                    req.on('upgrade', (res, socket, upgradeHead) => {
                        $scope.runRealTerminal(term, socket);
                        $scope.connectStatus = '已连接';
                        $scope.$apply();

                        socket.on('close', () => {
                            term.writeln('connection to server already closed.');
                            $scope.connectStatus = '已断开';
                            $scope.$apply();

                            term.on('key', function(key, ev) {
                                var printable = (!ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey);
                                if (ev.keyCode == 13) {
                                    term.destroy();
                                    $scope.connectContainer();
                                } else if (printable) {
                                    term.write(key);
                                }
                            });
                        });
                    });
                    req.write(JSON.stringify(reqData));
                    req.end();
                } else {
                    $scope.runFakeTerminal(term);
                    term.writeln(err.message);
                    $scope.connectStatus = '未连接';
                }
            });
        });
    };

    $scope.quit = function() {
        window.close();
    };

	$scope.minimize = function(){
		remote.getCurrentWindow().minimize();
	}

	$scope.maximize = function(){
		if(true == remote.getCurrentWindow().isMaximized()){
			remote.getCurrentWindow().unmaximize();
		}else{
			remote.getCurrentWindow().maximize();
		}
	};

    /*开始连接*/
    $scope.connectContainer();
});
