const electron = nodeRequire('electron');
const Docker = nodeRequire('dockerode');
const fs = nodeRequire('fs');
const ipcRenderer = electron.ipcRenderer;

var myApp = angular.module('myApp',[]);
myApp.controller('summaryController',function($scope, dockerService){

	//创建docker实例
	var docker = undefined;
	if("" == localStorage.dockerIP || "" == localStorage.dockerPort){
		$scope.APIAddress = "";
	}else{
		$scope.APIAddress = `${localStorage.dockerIP}:${localStorage.dockerPort}`;
		if("true" == localStorage.enableTLS){
			docker = new Docker({
				host: localStorage.dockerIP, 
				port: localStorage.dockerPort,
				ca: fs.readFileSync(`${__dirname}/../certificate/ca.pem`),
				cert: fs.readFileSync(`${__dirname}/../certificate/cert.pem`),
				key: fs.readFileSync(`${__dirname}/../certificate/key.pem`)
			});
		}else{
			docker = new Docker({host: localStorage.dockerIP, port: localStorage.dockerPort});
		}
	}
	
	$scope.Info = {};
	$scope.status = "Loading...";
	$scope.userName = localStorage.userName;

	docker.info(function(err, data){
		if(!err){
			$scope.status = "";
			$scope.Info = data;
			updateGraph($scope.Info.ContainersRunning, $scope.Info.ContainersStopped, $scope.Info.ContainersPaused);
			$scope.$apply();
		}else{
			$scope.status = err.message;
		}
	});

	var updateGraph = function(r, s, p){
		var ctx = document.getElementById("myChart").getContext("2d");
		var pieData = [
							{
								value: s,
								color:"#F7464A",
								highlight: "#FF5A5E",
								label: "Stopped"
							},
							{
								value: r,
								color: "#46BFBD",
								highlight: "#5AD3D1",
								label: "Running"
							},
							{
								value: p,
								color: "#949FB1",
								highlight: "#A8B3C5",
								label: "Paused"
							}
				];
		window.myPie = new Chart(ctx).Pie(pieData);
	};
});
