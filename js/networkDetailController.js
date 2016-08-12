const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote

var myApp = angular.module('myApp',['toastr']);

myApp.controller('networkDetailController',function($scope, toastr, dockerService){
	$scope.networkId = remote.getGlobal('sharedObject').networkId;
	$scope.containers = [];
	$scope.Name = '';
	$scope.Scope = '';
	$scope.Driver = '';
	$scope.Subnet = '';
	$scope.Gateway = '';

	$scope.refresh = function(){
		$scope.containers = [];
		dockerService.networkInspect(localStorage.dockerIP, localStorage.dockerPort, $scope.networkId)
			.success(function(data, status, headers){
				$scope.Name = data.Name;
				$scope.Scope = data.Scope;
				$scope.Driver = data.Driver;
				$scope.Subnet = data.IPAM.Config[0].Subnet;
				$scope.Gateway = data.IPAM.Config[0].Gateway;
				for(var c in data.Containers){
					if('ep-' != c.substr(0, 3)){
						$scope.containers.push(data.Containers[c]);
						var ip = data.Containers[c].IPv4Address.split('/')[0];
						$scope.containers[$scope.containers.length - 1]['IPv4AddressNum'] = ipToNumber(ip);
					}
				}
			}).error(function(data, status, headers){
				toastr.error('inspect network failed.')
			});
	};
	$scope.goBack =  function(){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'goBack'});
	};

	$scope.refresh();
});