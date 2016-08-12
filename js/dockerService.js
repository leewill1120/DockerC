const nodeHttp = nodeRequire('http');

myApp.factory('dockerService', function($http){
	return {
		serverInfo: function(host, port){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/info'
			});
		},
		containerList: function(host, port){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/containers/json?all=1'
			});
		},
		imageList: function(host, port){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/images/json?all=0'
			});
		},
		containerCreate: function(host, port, containerName, containerConfig){
			return $http({
				method:'POST',
				url:'http://' + host + ':' + port + '/containers/create?name=' + containerName,
				data: containerConfig
			});
		},
		containerStart: function(host, port, container){
			return $http({
				method:'POST',
				url: 'http://' + host + ':' + port + '/containers/' + container + '/start'
			});
		},
		containerStop: function(host, port, container){
			return $http({
				method:'POST',
				url: 'http://' + host + ':' + port + '/containers/' + container + '/stop'
			});
		},
		containerRestart: function(host, port, container){
			return $http({
				method:'POST',
				url: 'http://' + host + ':' + port + '/containers/' + container + '/restart'
			});
		},
		containerPause: function(host, port, container){
			return $http({
				method:'POST',
				url: 'http://' + host + ':' + port + '/containers/' + container + '/pause'
			});
		},
		containerUnpause: function(host, port, container){
			return $http({
				method:'POST',
				url: 'http://' + host + ':' + port + '/containers/' + container + '/unpause'
			});
		},
		containerRemove: function(host, port, container){
			return $http({
				method:'DELETE',
				url: 'http://' + host + ':' + port + '/containers/' + container + '?force=1'
			});
		},
		containerInspect: function(host, port, Id){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/containers/' + Id + '/json'
			});
		},
		containerStats: function(host, port, Id, callback){
			var options = {
				port: port,
				hostname: host,
				method: 'GET',
				path: `/containers/${Id}/stats`
			};

			var req = nodeHttp.request(options);
			req.on('response', (res) => {
				callback(res);
			});
			req.on('error', (e) => {
			  console.log(`problem with request: ${e.message}`);
			});
			req.end();
		},
		containerLogs: function(host, port, Id){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/containers/' + Id + '/logs?stdout=1&stderr=1'
			});
		},
		imageCreate: function(host, port, Name, callback){
			var options = {
				port: port,
				hostname: host,
				method:'POST',
				path:'http://' + host + ':' + port + '/images/create?fromImage=' + Name
			};

			var req = nodeHttp.request(options);
			req.on('response', (res) => {
				callback(res);
			});
			req.on('error', (e) => {
			  console.log(`problem with request: ${e.message}`);
			});
			req.end();

		},
		imageInspect: function(host,port,id){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/images/' + id + '/json'
			});
		},
		imageRemove: function(host, port, id){
			return $http({
				method:'DELETE',
				url:'http://' + host + ':' + port + '/images/' + id
			});
		},

		//网络操作
		networkList: function(host, port){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/networks'
			});
		},
		networkInspect: function(host, port, networkId){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/networks/' + networkId
			});
		},
		networkRemove:function(host, port, id){
			return $http({
				method:'DELETE',
				url:'http://' + host + ':' + port + '/networks/' + id
			});
		},
		networkCreate:function(host, port, config){
			return $http({
				method:'POST',
				url:'http://' + host + ':' + port + '/networks/create',
				data: config
			});
		},

		//数据卷操作
		volumeList: function(host, port){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/volumes'
			});
		},
		volumeInspect : function(host, port, Id){
			return $http({
				method:'GET',
				url:'http://' + host + ':' + port + '/volumes/' + Id
			});
		},
		volumeRemove: function(host, port, name){
			return $http({
				method:'DELETE',
				url:'http://' + host + ':' + port + '/volumes/' + name
			});
		},
		volumeCreate: function(host, port, config){
			return $http({
				method:'POST',
				url:'http://' + host + ':' + port + '/volumes/create',
				data: config
			});
		},
	};
});