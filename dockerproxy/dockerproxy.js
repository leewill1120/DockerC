#!/usr/bin/node
const http = require('http');
const httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({
  target:{
    socketPath:'/var/run/docker.sock'
  }
});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var proxyServer = http.createServer(function(req, res) {
  proxy.web(req, res);
  /*
  if(undefined != req.headers['x-dockerc-auth']){
    // You can define here your custom logic to handle the request
    // and then proxy the request.
    proxy.web(req, res);
  }else{
    res.statusCode = 401;
    res.end("Missing Auth Info.");
  }
*/
});


proxyServer.on('upgrade', function (req, socket, head) {
	var reqData = '';
	req.on('data', (chunk)=>{
		reqData += chunk;
	});
	req.on('end', ()=>{
		//向docker发送upgrade请求
		var options = {
			//socketPath:'/var/run/docker.sock',
			hostname:'10.0.0.128',
			port:2375,
			path: req.url,
			method: 'POST',
			headers:{
			  Connection:'Upgrade',
			  Upgrade:'tcp',
			  'Content-Type': 'application/json'
			}
		};

		var dockerReq = http.request(options);
		dockerReq.on('upgrade', (res, dockerSocket, upgradeHead) => {

			//当docker回应upgrade时候，回应客户端的upgrade请求
			var rspMsg = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}\r\n`;
			for(var h in res.headers){
				rspMsg += `${h}: ${res.headers[h]}\r\n`;
			}
			rspMsg += '\r\n';
			socket.write(rspMsg);

			socket.on('end', () => {
				console.log('Client socket end');
				dockerSocket.end();
			});

			dockerSocket.on('end', () => {
				console.log('Docker socket end');
				socket.end();
			});

			//流重定向
			dockerSocket.pipe(socket);
			socket.pipe(dockerSocket);
		});
		dockerReq.write(reqData);
		dockerReq.end();
	});
});


console.log("listening on port 80")
proxyServer.listen(80);