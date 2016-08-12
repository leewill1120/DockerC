const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('volumeCreateController',function($scope, toastr, dockerService){
	var volumes = {};
	$scope.headerColor = localStorage.headerColor;
	$scope.type = 'local';
	$scope.name = '';
	$scope.node = '';
	$scope.labels = {};
	$scope.tmpLabelKey = '';
	$scope.tmpLabelValue = '';

	dockerService.volumeList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = 0; i < data.Volumes.length; i++) {
				var volume = {
					FullName: data.Volumes[i].Name,
					Node: data.Volumes[i].Name.split('/')[0],
					LongName: data.Volumes[i].Name.split('/')[1],
					ShortName: data.Volumes[i].Name.split('/')[1].substr(0,12),
					Driver: data.Volumes[i].Driver,
					Mountpoint: data.Volumes[i].Mountpoint,
					ShortMountpoint: data.Volumes[i].Mountpoint.substr(0,64),
					Labels: data.Volumes[i].Labels
				};
				if('local' == volume.Driver){
					volume['backendStore'] = volume.Driver + '@' + volume.Node;
				}

				volumes[volume.FullName] = volume;
			}
		}).error(function(data, status, headers){
			if(-1 == status){
				toastr.error('网络连接异常');
			}else{
				toastr.error(data);
			}
		});
	dockerService.serverInfo(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			$scope.nodes = getNodes(data);
		}).error(function(data, status, headers){
			toastr.error(`获取节点列表失败,${status},${data}`);
		});

	$scope.addLabel = function(key, value){
		if(undefined == key || '' == key.trim()){
			return;
		}
		$scope.labels[key] = value;
		$scope.tmpLabelKey = '';
		$scope.tmpLabelValue = '';
	};

	$scope.delLabel = function(key){
		delete $scope.labels[key];
	};

	$scope.quit = function(){
		window.close();
	};

	$scope.reset = function(){
		$scope.name = "";
		$scope.type = 'local';
		$scope.node = '';
		$scope.labels = {};
		$scope.tmpLabelKey = '';
		$scope.tmpLabelValue = '';
	};

	$scope.volumeCreate = function(){
		$scope.text = "";
		$scope.OnProgressing = "progress-striped active";
		$scope.createStatus = "正在创建...";
		$scope.colorStatus = "success";
		if(!$scope.verifyInput()){
			$scope.colorStatus = 'danger';
			$scope.OnProgressing = "";
			$scope.text = '输入信息不完整';
			return;
		}

		if('local' == $scope.type || '' != $scope.node){
			for(var k in volumes){
				if(volumes[k].Node == $scope.node){
					if(volumes[k].LongName == $scope.name){
						$scope.colorStatus = 'danger';
						$scope.OnProgressing = "";
						$scope.text = `节点${$scope.node}上存在同名数据卷,请修改数据卷名称`;
						return;
					}
				}
			}
		}

		//开始创建数据卷
		var config = {
			Name:`${$scope.node}/${$scope.name}`,
			Labels:$scope.labels
		};
		config.Labels['DOCKERC_OWNER'] = localStorage.userName;
		if( '' != $scope.tmpLabelKey.trim()){
			config.Labels[$scope.tmpLabelKey] = $scope.tmpLabelValue;
			$scope.tmpLabelKey = '';
			$scope.tmpLabelValue = '';
		}

		dockerService.volumeCreate(localStorage.dockerIP, localStorage.dockerPort, config)
			.success(function(data, status, headers){
				$scope.OnProgressing = "";
				if(status == 201){
					//创建成功
					$scope.createStatus = "正在创建...完成!";
					$scope.text = `${data.Name} -> ${$scope.node}:${data.Mountpoint}`;
				}else{
					$scope.createStatus = "正在创建...失败!";
					$scope.colorStatus = "danger";
					$scope.text = data;
				}

			}).error(function(data, status, headers){
				$scope.createStatus = "正在创建...失败!";
				$scope.colorStatus = "danger";
				$scope.text = data;
			});
	}



	$scope.verifyInput = function(){
		if('' == $scope.name){
			return false;
		}

		if('local' == $scope.type && '' == $scope.node){
			return false;
		}

		return true;
	};
});
