const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const URL = nodeRequire('url');

var myApp = angular.module('myApp',['toastr']);

myApp.filter('wipeNode', function(){
	return function(input){
		if( -1 != input.indexOf('/')){
			return input.split('/')[1];
		}else{
			return input;
		}
	};
});

myApp.controller('containerCreateController',function($scope, toastr, dockerService){
	var networks = {};
	var volumes = {};
	var defaultIPAddressNum = 100;
	var currentIPAddressNum = defaultIPAddressNum;
	$scope.headerColor = localStorage.headerColor;

	$scope.images = {};
	$scope.nodes = {};
	$scope.networks = {};
	$scope.volumes = {}; //现有的数据卷
	$scope.ipAddresses = {};

	var imageName = URL.parse(document.URL,true).query.imageName;
	if("" != imageName && undefined != imageName){
		$scope.image = imageName;
	}else{
		$scope.image = "";
	}

	$scope.name = "";
	$scope.cmd = "";
	$scope.node = "";
	$scope.network = "";
	$scope.ipAddress = "";
	$scope.privileged = "false";
	$scope.restartPolicy = "";
	$scope.envs = {};
	$scope.volumeBinds = {}; //key是容器内目录(容器一个目录只能对应一个数据卷)
	$scope.ports = {}; //key宿主机端口+协议(宿主一个端口只能对应一个容器端口)
	$scope.labels = {};
	$scope.tmpProtocal = 'tcp';

	$scope.ipAddressDisable = false;
	$scope.maxRetryCountDisplay = 'none';

	$scope.tmpPortKey = "";
	$scope.tmpPortValue = "";
	$scope.tmpVolumeValue = "";
	$scope.tmpVolumeKey = "";
	$scope.tmpEnvValue = "";
	$scope.tmpEnvKey = "";
	$scope.tmpLabelKey = "";
	$scope.tmpLabelValue = "";

	dockerService.imageList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = 0; i < data.length; i++) {
				for (var j = 0; j < data[i].RepoTags.length; j++) {
					$scope.images[data[i].RepoTags[j]] = data[i].Id;
				}
			}
		}).error(function(data, status, headers){
			toastr.error(`获取镜像列表失败,${status},${data}`);
		});

	dockerService.serverInfo(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			$scope.nodes = getNodes(data);
		}).error(function(data, status, headers){
			toastr.error(`获取节点列表失败,${status},${data}`);
		});

	dockerService.networkList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = data.length - 1; i >= 0; i--) {
				$scope.networks[data[i].Id] = data[i];
				networks[data[i].Id] = data[i];
			}
		}).error(function(data, status, headers){
			toastr.error(`获取网络列表失败,${status},${data}`);
		});

	dockerService.volumeList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = data.Volumes.length - 1; i >= 0; i--) {
				volumes[data.Volumes[i].Name] = data.Volumes[i];
				$scope.volumes[data.Volumes[i].Name] = data.Volumes[i];
			}
		}).error(function(data, status, headers){
			toastr.error(`获取数据卷列表失败,${status},${data}`);
		});

	$scope.restartPolicyChanged = function(){
		if( 'on-failure' == $scope.restartPolicy){
			$scope.maxRetryCountDisplay = 'display';
		}else{
			$scope.maxRetryCountDisplay = 'none';
		}

	};

	$scope.nodeChanged = function(){
		if('' == $scope.node){
			$scope.networks = networks;
			$scope.volumes = volumes;
			return;
		}
		
		$scope.networks = {};
		for(var k in networks){
			if('global' == networks[k].Scope.trim()){
				$scope.networks[networks[k].Id] = networks[k];
			}else{
				if(networks[k].Name.split('/')[0].trim() == $scope.node.trim()){
					$scope.networks[networks[k].Id] = networks[k];
				}
			}
		}

		$scope.volumes = {};
		for(var k in volumes){
			if(volumes[k].Name.split('/')[0].trim() == $scope.node.trim()){
				$scope.volumes[volumes[k].Name] = volumes[k];
			}
		}
	};

	$scope.networkChanged = function(){
		currentIPAddressNum = defaultIPAddressNum;
		$scope.ipAddresses = {};
		var netId = $scope.network;
		if(undefined == $scope.networks[netId]){
			$scope.ipAddressDisable = true;
			return;
		}

		if($scope.networks[netId].Name.split('/').length == 2){
			var name = $scope.networks[netId].Name.split('/')[1].trim();
			if('none' == name || 'host' == name || 'bridge' == name){
				$scope.ipAddressDisable = true;
				return;
			}
		}

		if( 0 != $scope.networks[netId].IPAM.Config.length){
			$scope.ipAddressDisable = false;
			$scope.getAvailableIPList(netId, currentIPAddressNum, function(ipList){
				$scope.ipAddresses  = ipList;
			});
		}else{
			$scope.ipAddressDisable = true;
		}
	};

	$scope.getAvailableIPList = function(netId, ipListSize, callback){
		var IpInUse = {};
		var ipList = {};
		dockerService.networkInspect(localStorage.dockerIP, localStorage.dockerPort, netId)
			.success(function(data, status, headers){
				var Subnet = data.IPAM.Config[0].Subnet;
				var Gateway = data.IPAM.Config[0].Gateway;
				if(undefined != Gateway){
					IpInUse[Gateway] = {};
				}
				
				for(var c in data.Containers){
					if('ep-' != c.substr(0, 3)){
						IpInUse[data.Containers[c].IPv4Address.split('/')[0]] = {};
					}
				}

				var netNumber = getNetNumber(Subnet);
				var broadCaseNumber = getBroadCastNumber(Subnet);
				var cnt = 0;
				for(var i = broadCaseNumber - 1; i > netNumber; i--){
					if(cnt < ipListSize){
						var strIP = numberToIp(i);
						if(undefined != IpInUse[strIP]){
							continue;
						}else{
							ipList[strIP] = {};
							cnt++;
						}
					}
					else{
						break;
					}
				}
				if(undefined != callback){
					callback(ipList);
				}
			}).error(function(data, status, headers){
				toastr.error('inspect network failed.');
			});
	};

	$scope.moreIPAddress = function(){
		currentIPAddressNum += 100;
		$scope.getAvailableIPList(netId, currentIPAddressNum, function(ipList){
			$scope.ipAddresses  = ipList;
		});
	};

	$scope.addEnv = function(key, value){
		if(undefined == key || '' == key.trim()){
			return;
		}
		$scope.envs[key] = value;
		$scope.tmpEnvKey = '';
		$scope.tmpEnvValue = '';
	};

	$scope.delEnv = function(key){
		delete $scope.envs[key];
	};

	$scope.addVolume = function(containerDir, hostDir){
		if(undefined == containerDir || '' == containerDir.trim()){
			return;
		}
		$scope.volumeBinds[containerDir] = hostDir;
		$scope.tmpVolumeKey = '';
		$scope.tmpVolumeValue = '';
	};

	$scope.delVolume = function(containerDir){
		delete $scope.volumeBinds[containerDir];
	};

	$scope.addPort = function(hostPort, containerPort, protocal){
		if(undefined == hostPort || '' == hostPort.trim()){
			return;
		}
		$scope.ports[`${hostPort}/${protocal}`] = {
			hostPort:hostPort,
			containerPort:containerPort,
			protocal:protocal
		};
		$scope.tmpPortKey = '';
		$scope.tmpPortValue = '';
		$scope.tmpProtocal = 'tcp';
	};

	$scope.delPort = function(hostPort){
		delete $scope.ports[hostPort];
	};

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
		$scope.image = "";
		$scope.cmd = "";
		$scope.node = "";
		$scope.network = "";
		$scope.ipAddress = "";
		$scope.privileged = "false";
		$scope.restartPolicy = "";
		$scope.envs = {};
		$scope.volumeBinds = {}; //key是容器内目录(容器一个目录只能对应一个宿主目录)
		$scope.ports = {}; //key宿主机端口(宿主一个端口只能对应一个容器端口)
		$scope.labels = {};
		$scope.tmpProtocal = 'tcp';

		$scope.tmpPortKey = "";
		$scope.tmpPortValue = "";
		$scope.tmpVolumeValue = "";
		$scope.tmpVolumeKey = "";
		$scope.tmpEnvValue = "";
		$scope.tmpEnvKey = "";
		$scope.tmpLabelKey = "";
		$scope.tmpLabelValue = "";
	};

	$scope.containerCreate = function(autoStart){
		var config = {
			Hostname: $scope.name,
			Tty:true,
			Env:[],
			Cmd:[],
			Image: $scope.image,
			Labels: $scope.labels,
			ExposedPorts:{
			},
			StopSignal:"SIGTERM",
			HostConfig:{
				Binds:[],
				PortBindings:{},
				Privileged: $scope.privileged == "true" ? true : false,
				RestartPolicy:{
					Name:$scope.restartPolicy,
					MaximumRetryCount:$scope.maxRetryCount
				},
				NetworkMode: $scope.network,
			},
			NetworkingConfig:{
				EndpointsConfig:{}
			}
		};

		//固定IP地址
		if("" != $scope.ipAddress.trim()){
			config.NetworkingConfig.EndpointsConfig[$scope.network] = {
				IPAMConfig: {
					IPv4Address:$scope.ipAddress.trim()
				}
			};
			//增加固定IP地址标签
			config.Labels['DOCKERC_FIXED_IP'] = $scope.ipAddress.trim();
		}

		//命令
		if('' != $scope.cmd.trim()){
			var re = new RegExp("\\s+");
			var items = $scope.cmd.split(re);
			for(var i = 0; i < items.length; i++){
				config.Cmd.push(items[i]);
			}
		}

		//环境变量
		for(var e in $scope.envs){
			config.Env.push(`${e}=${$scope.envs[e]}`);
		}
		if('' != $scope.tmpEnvKey.trim()){
			config.Env.push(`${$scope.tmpEnvKey}=${$scope.tmpEnvValue}`);
		}
		if('' != $scope.node){
			config.Env.push(`constraint:node==${$scope.node}`);
		}

		//数据卷
		for(var v in $scope.volumeBinds){
			config.HostConfig.Binds.push(`${$scope.volumeBinds[v]}:${v}`);
		}
		if('' != $scope.tmpVolumeKey.trim()){
			config.HostConfig.Binds.push(`${$scope.tmpVolumeValue}:${$scope.tmpVolumeKey}`);
		}

		//暴露端口
		for(var k in $scope.ports){
			var key = `${$scope.ports[k]['containerPort']}/${$scope.ports[k]['protocal']}`;
			if(!(config.HostConfig.PortBindings[key] instanceof Array)){
				config.HostConfig.PortBindings[key] = [];
			}
			config.ExposedPorts[key] = {};
			config.HostConfig.PortBindings[key].push({HostPort:$scope.ports[k]['hostPort']});
		}
		if('' != $scope.tmpPortValue.trim()){
			var key = `${$scope.tmpPortValue}/${$scope.tmpProtocal}`;
			if(!(config.HostConfig.PortBindings[key] instanceof Array)){
				config.HostConfig.PortBindings[key] = [];
			}
			config.ExposedPorts[key] = {};
			config.HostConfig.PortBindings[key].push({HostPort:$scope.tmpPortKey});
		}

		//标签
		if( '' != $scope.tmpLabelKey.trim()){
			config.Labels[$scope.tmpLabelKey] = $scope.tmpLabelValue;
			$scope.tmpLabelKey = '';
			$scope.tmpLabelValue = '';
		}
		config.Labels['DOCKERC_OWNER'] = localStorage.userName;

		$scope.text = "";
		$scope.createStatus = "正在创建...";
		$scope.colorStatus = "success";
		$scope.OnProgressing = "progress-striped active";
		dockerService.containerCreate(localStorage.dockerIP, localStorage.dockerPort, $scope.name, config)
			.success(function(data, status, headers){
				if(201 == status){
					$scope.text = data.Id;
					if(autoStart){
						$scope.createStatus = "正在启动...";
						dockerService.containerStart(localStorage.dockerIP, localStorage.dockerPort, data.Id)
							.success(function(data, status, headers){
								if(204 == status){
									$scope.createStatus = "正在启动...完成!";
								}else{
									$scope.createStatus = "正在启动...失败!";
									$scope.text = data;
									$scope.colorStatus = "danger";
								}
								$scope.OnProgressing = "";
							}).error(function(data, status, headers){
								$scope.createStatus = "正在启动...失败!";
								$scope.colorStatus = "danger";
								$scope.OnProgressing = "";
								if(null == data){
									$scope.text = `状态码${status}`;
								}else{
									$scope.text = data;
								}
							});
					}else{
						$scope.createStatus = "正在创建...完成!";
						$scope.OnProgressing = "";
					}
				}else{
					$scope.createStatus = "创建失败";
					$scope.colorStatus = "danger";
					$scope.OnProgressing = "";
					$scope.text = data;
				}
			}).error(function(data, status, headers, config){
				$scope.createStatus = "创建失败";
				$scope.colorStatus = "danger";
				$scope.OnProgressing = "";
				if(null == data){
					$scope.text = `状态码${status}`;
				}else{
					$scope.text = data;
				}
			});
	};
});