const electron = nodeRequire('electron');
const fs = nodeRequire('fs');
const http = nodeRequire('http');
const path = nodeRequire('path');
const unzip = nodeRequire('unzip');
const ipcRenderer = electron.ipcRenderer;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('appMarketController', function($scope, toastr, $http){

	$scope.loaded = false;
	$scope.headerColor = localStorage.headerColor;

	$scope.quit = function(){
		window.close();
	};

	$scope.toolMarketURL = localStorage.dockersURL + '/toolmarket';
	$scope.tools = {};

	$scope.refresh = function(){
		$scope.loaded = false;
		$http({
			method:'GET',
			headers:{
				'Cache-Control': 'no-cache'
			},
			url:$scope.toolMarketURL + '/tools'
		}).success(function(data, status, headers){
			$scope.tools = data;
			$scope.loaded = true;
		}).error(function(data, status, headers){
			toastr.error('连接市场失败');
			$scope.loaded = true;
			console.log(`连接市场失败 ${status} ${data}`);
		});
	};

	$scope.install = function(t){
		var installDir = `${__dirname}/../../plugins`;
		var savePath = installDir + `/${t}.zip`;
		downloadFile($scope.toolMarketURL + $scope.tools[t].url, savePath, function(err){
			if(err){
				toastr.error(err);
			}else{
				//下载完成，开始解压
				var extract = unzip.Extract({ path:  `${installDir}/${t}`});
				extract.on('error', function(err) {
				    console.log("error++++++++++++++++++++++");
				    console.log(err);
				    //解压异常处理
				});
				extract.on('finish', function() {
				    console.log("解压完成!!");
				    fs.unlinkSync(savePath);
				    toastr.options = {positionClass: "toast-botton-right"};
				    toastr.success('安装完成，请刷新工具页面');
				});
				fs.createReadStream(savePath).pipe(extract);
			}
		});
	};

	$scope.refresh();
});


function downloadFile(file_url, file_save_path, callback){ 
	var file = fs.createWriteStream(file_save_path);  
	  
	http.get(file_url, function(res) {
		if(res.statusCode >= 400 && res.statusCode < 600){
			res.on('data', function(data){
				console.log(data.toString());
				callback('下载失败,文件不存在.');
			});
		}else{
		    res.on('data', function(data) {
		            file.write(data);
		        }).on('end', function() {  
		            file.end();
		            console.log(path.basename(file_save_path) + ' downloaded to ' + path.dirname(file_save_path));
		            callback();
		        }).on('error', function(err){
		        	file.end();
		        	callback(err);
		        });
		}
	});
}