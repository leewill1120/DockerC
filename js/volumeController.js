const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;
const clipboard = electron.clipboard;

var myApp = angular.module('myApp',['toastr']);

myApp.filter('cutMountpoint', function(){
	return function(input){
		var len = input.length;
		if(len <= 64){
			return input;
		}else{
			var p1 = input.substring(0, Math.round(len/3));
			var p3 = input.substring(Math.round(2 * len / 3), len);
			return `${p1}...${p3}`;			
		}

	}
});

myApp.controller('volumeController',function($scope, toastr, dockerService){
	var localvolumes = {};
	$scope.volumes = {};
	$scope.status = "Loading...";
	$scope.filterWord = "";

	$scope.refresh = function(){
		$scope.multiOperatorButtonDisplay = false;
		dockerService.volumeList(localStorage.dockerIP, localStorage.dockerPort)
			.success(function(data, status, headers){
				$scope.status = "";
				localvolumes = {};
				$scope.volumes = {};
				$scope.all = false;
				for (var i = 0; i < data.Volumes.length; i++) {
					var volume = {
						FullName: data.Volumes[i].Name,
						Node: data.Volumes[i].Name.split('/')[0],
						ShortName: data.Volumes[i].Name.split('/')[1].substr(0,12),
						Driver: data.Volumes[i].Driver,
						Mountpoint: data.Volumes[i].Mountpoint,
						showMountpoint:data.Volumes[i].Mountpoint,
						Labels: data.Volumes[i].Labels,
						Owner:'',
						Checked:false
					};

					var len = volume.Mountpoint.length;
					if(len > 64){
						var p1 = volume.Mountpoint.substring(0, Math.round(len/4));
						var p3 = volume.Mountpoint.substring(Math.round(3 * len / 4), len);
						volume.showMountpoint = `${p1}......${p3}`;	
					}

					if(null != volume.Labels){
						volume['Owner'] = data.Volumes[i].Labels['DOCKERC_OWNER'] == undefined ? '' : data.Volumes[i].Labels['DOCKERC_OWNER'];
					}
					
					if('local' == volume.Driver){
						volume['backendStore'] = volume.Driver + '@' + volume.Node;
					}

					localvolumes[volume.FullName] = volume;
					$scope.status = "";
					$scope.searchKeyUp();
				}
			}).error(function(data, status, headers){
				if(-1 == status){
					$scope.status = '网络连接异常';
				}else{
					$scope.status = data;
				}
			});
	};

	$scope.volumeRemove = function(name, sure){
		if(undefined == sure){
			sure = confirm('确定删除数据卷' + name + '吗?');
		}
		if(sure){
			dockerService.volumeRemove(localStorage.dockerIP, localStorage.dockerPort, name)
				.success(function(data, status, headers){
					toastr.error(`数据卷 ${name} 删除成功`);
					$scope.refresh();
				}).error(function(data, status, headers){
					toastr.error(data + '状态码:' + status);
				});
		}
	};

	$scope.selectAll = function(){
		if($scope.all){
			var cnt = 0;
			for(var i in $scope.volumes){
				$scope.volumes[i].Checked = true;
				cnt++;
			}
			if( cnt > 0){
				$scope.multiOperatorButtonDisplay = true;
			}
		}else{
			for(var i in $scope.volumes){
				$scope.volumes[i].Checked = false;
			}
			$scope.multiOperatorButtonDisplay = false;
		}
	};

	$scope.selectOne = function(){
		var cnt = 0;
		for(var i in $scope.volumes){
			if($scope.volumes[i].Checked){
				cnt++;
			}
		}

		if( 0 == cnt){
			$scope.multiOperatorButtonDisplay = false;
			$scope.all = false;
		}else{
			$scope.multiOperatorButtonDisplay = true;
			if( getAttrNum($scope.volumes) == cnt){
				$scope.all = true;
			}else{
				$scope.all = false;
			}
		}
	};

	$scope.searchKeyUp = function(){
		$scope.volumes = {};
		for (var i in localvolumes) {
			if( -1 != localvolumes[i].ShortName.toLowerCase().indexOf($scope.filterWord.toLowerCase())){
				$scope.volumes[i] = localvolumes[i];
			}
		}
	};

	$scope.removeMulti = function(){
		for(var i in $scope.volumes){
			if($scope.volumes[i].Checked){
				$scope.volumeRemove($scope.volumes[i].FullName, true);
			}
		}
	};

	$scope.copyMountpoint = function(key){
		clipboard.writeText($scope.volumes[key].Mountpoint);
		toastr.info('挂载点已复制到剪切板');
	};

	$scope.volumeCreate = function(){
      var win = new BrowserWindow({
        width: 800, 
        height: 550,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/volumeCreate.html`);
	};

	$scope.refresh();
});