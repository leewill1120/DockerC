const electron = nodeRequire('electron');
const fs = nodeRequire('fs');
const http = nodeRequire('http');
const path = nodeRequire('path');
const unzip = nodeRequire('unzip');

const ipcRenderer = electron.ipcRenderer;

var myApp = angular.module('myApp',['toastr']);

deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

myApp.controller('toolController',function($scope, $http, toastr, dockerService){
	$scope.tools = {};
	var marketTools = {};

	var menu = new BootstrapMenu('.rightmenu', {
		fetchElementData: function($rowElem) {
			return $rowElem[0].id;
		},
		actions: [
			{
				name: '升级',
				onClick: function(id) {
					if($scope.tools[id].updateSign){
						$scope.tools[id]['updating'] = true;
						$scope.$apply();
						$scope.update(id);
					}else{
						toastr.info("当前已经是最新版本");
					}
				}
			}, {
				name: '卸载',
				onClick: function(id) {
					if(confirm(`确定卸载 "${id}" 吗`)){
						deleteFolderRecursive(`${__dirname}/../../plugins/${id}`);
						toastr.success(`${id} 已卸载`);
						$scope.refresh();
						$scope.$apply();
					}
				}
			}]
		});
	$scope.refresh = function(){
		$scope.tools = {};
		marketTools = {};

		var plugins = fs.readdirSync(`${__dirname}/../../plugins`);
		for (var i = 0; i < plugins.length; i++) {
			var plugin = plugins[i];
			var stat = fs.statSync(`${__dirname}/../../plugins/${plugin}`);
			if(stat.isDirectory()){
				var data = fs.readFileSync(`${__dirname}/../../plugins/${plugin}/plugin.json`);
				$scope.tools[plugin] = JSON.parse(data);
				$scope.tools[plugin]['dir'] = plugin;
				$scope.tools[plugin]['updateSign'] = false;
				$scope.tools[plugin]['updating'] = false;
			}
		}

		//检查更新
		$http({
			method:'GET',
			headers:{
				'Cache-Control': 'no-cache'
			},
			url:localStorage.dockersURL + '/toolmarket/tools'
		}).success(function(data, status, headers){
			marketTools = data;
			for(var t in $scope.tools){
				if(undefined != marketTools[t]){
					if(compareVersion($scope.tools[t].version, marketTools[t].version)){
						$scope.tools[t]['updateSign'] = true;
					}
				}
			}
		}).error(function(data, status, headers){
			toastr.error(`连接市场失败 ${status} ${data}`);
		});
	};

	$scope.openAppMarket = function(){
		ipcRenderer.send('asynchronous-message', {cmd:'openAppMarket'});
	};

	$scope.openTool = function(name){
		ipcRenderer.send('asynchronous-message', {cmd:'openPlugin', argument:$scope.tools[name]});
	};

	$scope.update = function(t){
		var installDir = `${__dirname}/../../plugins`;
		var savePath = installDir + `/${t}.zip`;
		downloadFile(localStorage.dockersURL + '/toolmarket' + marketTools[t].url, savePath, function(err){
			if(err){
				toastr.error(err);
			}else{
				//删除原工具
				deleteFolderRecursive(`${__dirname}/../../plugins/${t}`);

				//下载完成，开始解压
				var extract = unzip.Extract({ path:  `${installDir}/${t}`});
				extract.on('error', function(err) {
				    toastr.error(err);
				});
				extract.on('finish', function() {
				    console.log("解压完成!!");
				    fs.unlinkSync(savePath);
				    toastr.success(`${t} 升级完成`);
				    setTimeout($scope.refresh, 1000);
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
				toastr.error(data.toString());
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