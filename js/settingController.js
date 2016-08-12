const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('settingController', function($scope, toastr, dockerService){
	$scope.dockerIP = localStorage.dockerIP;
	$scope.headerColor = localStorage.headerColor;
	$scope.dockerPort = parseInt(localStorage.dockerPort);
	$scope.dockersURL = localStorage.dockersURL;
	$scope.userName = localStorage.userName;
	$scope.enableTLS = localStorage.enableTLS == "true";
	$scope.testResult = '';
	$scope.advance = false;
	$scope.quit = function(){
		window.close();
	};
	$scope.test = function(){
		$scope.testResult='refresh';
		dockerService.serverInfo($scope.dockerIP, $scope.dockerPort)
			.success(function(data, status, headers){
				$scope.testResult = "ok";
			}).error(function(data, status, headers){
				$scope.testResult = "remove";
			});
	};
	$scope.saveAndExit = function(){
		if('' == $scope.userName){
			toastr.warning('请输入用户名');
			return;
		}
		if('Administrator' == $scope.userName){
			toastr.warning('用户名不可用，请修改。');
			return;
		}
		if('' == $scope.dockerIP){
			toastr.warning('请输入API地址');
			return;
		}
		if(isNaN($scope.dockerPort)){
			toastr.warning('API端口号非法');
			return;
		}
		localStorage.dockerIP = $scope.dockerIP;
		localStorage.dockerPort = $scope.dockerPort;
		localStorage.headerColor = $scope.headerColor;
		localStorage.dockersURL = $scope.dockersURL;
		localStorage.userName = $scope.userName;
		localStorage.enableTLS = $scope.enableTLS;
		ipcRenderer.send('asynchronous-message', {cmd:'reload'});
		window.close();
	};
});