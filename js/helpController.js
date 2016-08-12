const electron = nodeRequire('electron');
const remote = electron.remote;

var myApp = angular.module('myApp',['ui.bootstrap']);
myApp.controller('helpController',function($scope){
	var helpURL = localStorage.dockersURL + '/docs/';

	if(undefined == localStorage.headerColor){
		localStorage.headerColor = '5c5cff';
	}

	$scope.headerColor = localStorage.headerColor;

	var loaded = false;
	const webview = document.getElementById('mywebview');
	webview.addEventListener('dom-ready', () => {
		if(!loaded){
			webview.loadURL(helpURL);
			loaded = true;
		}
	});

	
	$scope.quit = function(){
		window.close();
	}

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
});