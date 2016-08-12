const electron = nodeRequire('electron');
const URL = nodeRequire('url');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;

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

myApp.controller('containerUpdateController',function($scope, toastr, dockerService){
	var networks = {};
	var volumes = {};
	var defaultIPAddressNum = 100;
	var currentIPAddressNum = defaultIPAddressNum;
	var srcContainerName = URL.parse(document.URL,true).query.srcContainerName;
	var ignoreEnvs = {PATH:''};
	var ignoreLabels = {DOCKERC_OWNER:''};
	var readyCnt = 4;

	$scope.headerColor = localStorage.headerColor;
	$scope.showAdvance = false;
	$scope.loaded = false;

	$scope.images = {};
	$scope.nodes = {};
	$scope.networks = {};
	$scope.volumes = {}; //现有的数据卷
	$scope.ipAddresses = {};

	$scope.name = "";
	$scope.image = "";
	$scope.cmd = "";
	$scope.node = "";
	$scope.network = "";
	$scope.ipAddress = "";
	$scope.privileged = "false";
	$scope.restartPolicy = "";
	$scope.envs = {};
	$scope.volumeBinds = {}; //key是容器内目录(容器一个目录只能对应一个数据卷)
	$scope.ports = {}; //key宿主机端口(宿主一个端口只能对应一个容器端口)
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
			readyCnt--;
		}).error(function(data, status, headers){
			toastr.error(`获取镜像列表失败,${status},${data}`);
		});

	dockerService.serverInfo(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			$scope.nodes = getNodes(data);
			readyCnt--;
		}).error(function(data, status, headers){
			toastr.error(`获取节点列表失败,${status},${data}`);
		});

	dockerService.networkList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = data.length - 1; i >= 0; i--) {
				$scope.networks[data[i].Id] = data[i];
				networks[data[i].Id] = data[i];
			}
			readyCnt--;
		}).error(function(data, status, headers){
			toastr.error(`获取网络列表失败,${status},${data}`);
		});

	dockerService.volumeList(localStorage.dockerIP, localStorage.dockerPort)
		.success(function(data, status, headers){
			for (var i = data.Volumes.length - 1; i >= 0; i--) {
				volumes[data.Volumes[i].Name] = data.Volumes[i];
				$scope.volumes[data.Volumes[i].Name] = data.Volumes[i];
			}
			readyCnt--;
		}).error(function(data, status, headers){
			toastr.error(`获取数据卷列表失败,${status},${data}`);
		});

	//获取升级源信息
	var timer = setInterval(function(){
		console.log(readyCnt);
		if(readyCnt == 0){
			$scope.loaded = true;
			clearInterval(timer);
			dockerService.containerInspect(localStorage.dockerIP, localStorage.dockerPort, srcContainerName)
				.success(function(data, status, headers){
					$scope.Info = data;
					if('default' == $scope.Info.HostConfig.NetworkMode){
						$scope.Info.HostConfig.NetworkMode = 'bridge';
					}

					//容器名称
					$scope.name = data.Name.replace('/', '');
					//获取镜像
					$scope.image = data.Config.Image;
					//CMD
					$scope.cmd = data.Config.Cmd.join(' ');
					//节点
					$scope.node = data.Node.Name;
					$scope.nodeChanged();

					//网络
					if(undefined == $scope.networks[data.HostConfig.NetworkMode]){
						//是名称
						for(var n in $scope.networks){
							if($scope.networks[n].Scope == 'local'){
								if($scope.networks[n].Name == `${$scope.node}/${data.HostConfig.NetworkMode}`){
									$scope.network = n;
									break;
								}
							}else{
								if($scope.networks[n].Name == data.HostConfig.NetworkMode){
									$scope.network = n;
									break;
								}
							}
						}
					}else{
						//是Id
						$scope.network = data.HostConfig.NetworkMode;
					}

					//加载可用IP地址列表显示固定IP
					$scope.networkChanged(function(){
						//固定IP地址
						if(data.Config.Labels['DOCKERC_FIXED_IP'] != undefined){
							$scope.ipAddress = data.Config.Labels['DOCKERC_FIXED_IP'];
							$scope.ipAddresses[$scope.ipAddress] = {};
						}
					});


					//特权模式
					$scope.privileged = data.HostConfig.Privileged ? "true" : "false";

					//重启策略
					$scope.restartPolicy = data.HostConfig.RestartPolicy.Name;
					$scope.maxRetryCount = data.HostConfig.RestartPolicy.MaximumRetryCount;
					$scope.restartPolicyChanged();

					//环境变量
					for (var i = 0; i < data.Config.Env.length; i++) {
						var key = data.Config.Env[i].split('=')[0];
						var value = data.Config.Env[i].split('=')[1]
						if( undefined == ignoreEnvs[key]){
							$scope.envs[key] = value;
						}
					}

					//数据卷
					for (var i = 0; i < data.HostConfig.Binds.length; i++) {
						var key = data.HostConfig.Binds[i].split(':')[1];
						var value = data.HostConfig.Binds[i].split(':')[0];
						$scope.volumeBinds[key] = value;
					}

					//暴露端口
					for(var p in data.HostConfig.PortBindings){
						var containerPort = p.split('/')[0];
						var protocal = p.split('/')[1];
						for (var i = 0; i < data.HostConfig.PortBindings[p].length; i++) {
							var hostPort = data.HostConfig.PortBindings[p][i].HostPort;
							$scope.ports[`${hostPort}/${protocal}`] = {
								hostPort:hostPort,
								containerPort:containerPort,
								protocal:protocal
							};
						}
					}

					//标签
				}).error(function(data, status, headers){
					toastr.error('inspect container failed.')
				});
		}
	}, 1000);


	$scope.restartPolicyChanged = function(){
		if( 'on-failure' == $scope.restartPolicy){
			$scope.maxRetryCountDisplay = 'display';
		}else{
			$scope.maxRetryCountDisplay = 'none';
		}

	};

	$scope.nodeChanged = function(){
		$scope.network = '';
		$scope.networkChanged();

		$scope.tmpVolumeKey = '';
		$scope.tmpVolumeValue = '';
		$scope.volumeBinds = {};

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

	$scope.networkChanged = function(callback){
		$scope.ipAddress = "";
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
				if(undefined != callback){
					callback();
				}
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

	$scope.containerUpdate = function(){
		//获取原容器运行状态
		$scope.text = `删除原容器${srcContainerName}.`;
		$scope.createStatus = "正在升级...";
		$scope.colorStatus = "success";
		$scope.OnProgressing = "progress-striped active";

		var autoStart = $scope.Info.State.Running;
		//删除原来容器，忽略容器不存在的错误
		dockerService.containerRemove(localStorage.dockerIP, localStorage.dockerPort, srcContainerName)
			.success(function(data, status, headers){
				if(204 == status){
					//创建新容器
					$scope.containerCreate(autoStart);
				}else{
					console.log(`删除原容器${srcContainerName}...失败.详细信息:${data}`);
					$scope.text = `删除原容器${srcContainerName}...失败.详细信息:${data}`;
					$scope.createStatus = "正在升级...失败";
					$scope.colorStatus = "danger";
					$scope.OnProgressing = "";
				}
			}).error(function(data, status, headers){
				if(404 == status){
					//忽略容器不存在错误创建新容器
					$scope.containerCreate(autoStart);
				}else{
					console.log(`删除原容器${srcContainerName}...失败.详细信息:${data}`);
					$scope.text = `删除原容器${srcContainerName}...失败.详细信息:${data}`;
					$scope.createStatus = "正在升级...失败";
					$scope.colorStatus = "danger";
					$scope.OnProgressing = "";
				}
			});
	};

	$scope.containerCreate = function(autoStart){
		//开始创建新容器
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
					IPv4Address:$scope.ipAddress.trim(),
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
		}
		config.Labels['DOCKERC_OWNER'] = localStorage.userName;

		dockerService.containerCreate(localStorage.dockerIP, localStorage.dockerPort, $scope.name, config)
			.success(function(data, status, headers){
				if(201 == status){
					if(autoStart){
						$scope.text = data.Id;
						dockerService.containerStart(localStorage.dockerIP, localStorage.dockerPort, data.Id)
							.success(function(data, status, headers){
								if(204 == status){
									$scope.createStatus = "正在升级...完成!";
									$scope.text = "升级完成并已启动";
									$scope.OnProgressing = "";
								}else{
									$scope.createStatus = "正在升级...失败!";
									$scope.text = data;
									$scope.colorStatus = "danger";
								}
								$scope.OnProgressing = "";
							}).error(function(data, status, headers){
								$scope.createStatus = "正在升级...失败!";
								$scope.colorStatus = "danger";
								$scope.OnProgressing = "";
								if(null == data){
									$scope.text = `状态码${status}`;
								}else{
									$scope.text = data;
								}
							});
					}else{
						$scope.createStatus = "正在升级...完成!";
						$scope.text = data.Id;
						$scope.OnProgressing = "";
					}
				}else{
					$scope.createStatus = "升级失败";
					$scope.colorStatus = "danger";
					$scope.OnProgressing = "";
					$scope.text = data;
				}
			}).error(function(data, status, headers, config){
				$scope.createStatus = "升级失败";
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