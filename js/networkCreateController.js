const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('networkCreateController',function($scope, toastr, dockerService){
	var networks = {};
	$scope.headerColor = localStorage.headerColor;
	$scope.drivers = ['bridge', 'overlay'];
	$scope.type = 'bridge';
	$scope.name = '';
	$scope.node = '';
	$scope.subnet = '';
	$scope.gateway = '',
	$scope.labels = {};
	$scope.tmpLabelKey = '';
	$scope.tmpLabelValue = '';

	dockerService.networkList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = data.length - 1; i >= 0; i--) {
				networks[data[i].Id] = data[i];
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
		$scope.name = '';
		$scope.subnet = '';
		$scope.gateway = '';
		$scope.type = 'bridge';
		$scope.node = '';
		$scope.labels = {};
		$scope.tmpLabelKey = '';
		$scope.tmpLabelValue = '';
	};

	$scope.networkCreate = function(){
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

		//开始创建网络
		var config = {
		  "Name":'',
		  "CheckDuplicate":false,
		  "Driver":$scope.type,
		  "EnableIPv6": true,
		  "IPAM":{
		    "Config":[
		       {
		          "Subnet":$scope.subnet,
		          "Gateway":$scope.gateway
		        }
		    ]
		  },
		  "Options":$scope.labels
		};
		if($scope.type == 'overlay'){
			config.Name = $scope.name;
		}else{
			config.Name = `${$scope.node}/${$scope.name}`;
		}
		config.Options['DOCKERC_OWNER'] = localStorage.userName;
		if( '' != $scope.tmpLabelKey.trim()){
			config.Options[$scope.tmpLabelKey] = $scope.tmpLabelValue;
			$scope.tmpLabelValue = '';
			$scope.tmpLabelKey = '';
		}

		dockerService.networkCreate(localStorage.dockerIP, localStorage.dockerPort, config)
			.success(function(data, status, headers){
				$scope.OnProgressing = "";
				if(status == 201){
					//创建成功
					$scope.createStatus = "正在创建...完成!";
					$scope.text = data.Id;
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

	$scope.verifyName = function(){
		if('' != $scope.name && '' != $scope.node){
			for(var n in networks){
				if(networks[n].Scope.trim() == 'global'){
					if($scope.name == networks[n].Name){
						toastr.warning(`网络名与全局网络${networks[n].Name}冲突,请使用其他名称.`);
						return false;
					}
				}else{
					if(networks[n].Name.split('/').length == 2){
						var node = networks[n].Name.split('/')[0];
						var netName = networks[n].Name.split('/')[1];
						if(node == $scope.node && netName == $scope.name){
							toastr.warning(`网络名称${$scope.name}在该节点上已存在,请使用其他名称.`);
							return false;
						}
					}else{
						console.log('非法网络名');
					}
				}
			}
		}
		return true;
	}

	$scope.verifyInput = function(){
		if('' == $scope.name || '' == $scope.subnet || '' == $scope.gateway){
			return false;
		}

		if('overlay' != $scope.type && '' == $scope.node){
			return false;
		}

		return true;
	};
});
