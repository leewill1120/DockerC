const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote

var myApp = angular.module('myApp',['toastr']);
const cacheLength = 3600;
const defaultStartShowIndex = cacheLength - 60;

myApp.filter('formatID', function(){
	return function(input){
		if(undefined == input){
			return "";
		}
		if('sha256:' == input.substr(0, 7)){
			return input.substr(7, 12);
		}else{
			return input.substr(0, 12);
		}
	}
});

myApp.filter('formatTime', function(){
	return function(input){
		var t = new Date(input);
		return t.toLocaleString();
	}
});

myApp.controller('imageDetailController',function($scope, toastr, dockerService){
	$scope.summaryDisplay = "display";
	$scope.moreDisplay = "none";
	$scope.moreShowWord = "更多";
	$scope.imageId = remote.getGlobal('sharedObject').imageId;
	$scope.Info = {};

	$scope.refresh = function(){
		if(undefined == $scope.imageId){
			toastr.error('image Id is undefined.');
			return;
		}
		dockerService.imageInspect(localStorage.dockerIP, localStorage.dockerPort, $scope.imageId)
			.success(function(data, status, headers){
				$scope.Info = data;
			}).error(function(data, status, headers){
				toastr.error(data + '状态码:' + status);
			});
	};

	$scope.goBack =  function(){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'goBack'});
	};

	$scope.more = function(){
		if("none" == $scope.moreDisplay){
			$scope.summaryDisplay = "none";
			$scope.moreDisplay = "display";
			$scope.moreShowWord = "收起";
			$scope.TextArea = jsonStringify($scope.Info, 4);
		}else{
			$scope.moreDisplay = "none";
			$scope.summaryDisplay = "display";
			$scope.moreShowWord = "更多";
		}
	};

	$scope.refresh();
});

function jsonStringify(data,space){
    var seen=[];
    return JSON.stringify(data,function(key,val){
        if(!val||typeof val !=='object'){
            return val;
        }
        if(seen.indexOf(val)!==-1){
            return '[Circular]';
        }
        seen.push(val);
        return val;
    },space);
}