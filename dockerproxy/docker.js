const http = require('http');

/*
var postData = querystring.stringify({
  'msg' : 'Hello World!'
});
*/

var options = {
  hostname: '10.0.0.128',
  port: 8080,
  path: '/containers/c1/attach?stderr=1&stdin=1&stdout=1&stream=1',
  method: 'POST',
  headers:{
  	Connection:'Upgrade',
  	Upgrade:'tcp'
  }
};

var req = http.request(options, (res)=>{
	console.log(`STATUS: ${res.statusCode}`);
	console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
	res.setEncoding('utf8');
	res.on('data', (chunk) => {
	console.log(`BODY: ${chunk}`);
	});
	res.on('end', () => {
	console.log('No more data in response.');
	});
});

/*
req.on('connect', (res, socket, head) => {
	console.log('got connected!');
	socket.on('data', (chunk) => {
	  console.log(chunk.toString());
	});
	socket.on('end', () => {
	  console.log('end');
	});
	socket.on('error', (err) => {
	  console.log(err.message);
	});
});
*/
req.on('error', (e) => {
  console.log(`problem with request: ${e.message}`);
});

req.on('upgrade', (res, socket, upgradeHead) => {
	process.stdin.pipe(socket);
	socket.pipe(process.stdout);
});

// write data to request body
//req.write(postData);
req.end();