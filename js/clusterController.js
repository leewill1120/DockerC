const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;
const clipboard = electron.clipboard;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('clusterController',function($scope, toastr, dockerService){
	var localnodes = {};
	$scope.filterWord = "";
	$scope.nodes = {};
	$scope.status = "Loading...";
	$scope.refresh = function(){
		$scope.nodes = {};
		localnodes = {};
		dockerService.serverInfo(localStorage.dockerIP, localStorage.dockerPort)
			.success(function(data, status, headers){
				$scope.status = "";
				localnodes = getNodes(data);
				$scope.nodes  = localnodes;
			}).error(function(data, status, headers){
				$scope.status = data;
				toastr.error(`获取节点列表失败`);
			});
	};

	$scope.searchKeyUp = function(){
		$scope.nodes = {};
		for (var i in localnodes) {
			if( -1 != localnodes[i].Name.toLowerCase().indexOf($scope.filterWord.toLowerCase())){
				$scope.nodes[i] = localnodes[i];
			}
		}
	};

	$scope.refresh();
});