const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;

var myApp = angular.module('myApp',['toastr']);

myApp.filter('shortID', function(){
	return function(input){
		return input.substr(0, 12);
	}
});

myApp.filter('getIpAddress', function(){
	return function(input){
		if(undefined != input.IPAddress && null != input.IPAddress){
			return input.IPAddress;
		}
	}
});

myApp.controller('containerController',function($scope, toastr, dockerService){
	var localContainers = {};
	$scope.containers={};
	$scope.status = "Loading...";
	$scope.multiOperatorButtonDisplay = false;
	$scope.filterWord = "";

	$scope.refresh = function(){
		$scope.multiOperatorButtonDisplay = false;
		$scope.all = false;
		$scope.containers={};
		localContainers = {};
		dockerService.containerList(localStorage.dockerIP, localStorage.dockerPort)
			.success(function(data, status, headers){
				$scope.status = "";
				for (var i = 0; i < data.length; i++) {
					var container = {
						Id: data[i].Id,
						Name: data[i].Names[0].substr(1),
						Network: {},
						Status: data[i].Status,
						State: data[i].State,
						Labels: data[i].Labels,
						Checked:false,
						StateCSS:'',
						Owner:data[i].Labels['DOCKERC_OWNER'] == undefined ? '': data[i].Labels['DOCKERC_OWNER']
					};
					switch(container.State){
						case 'running':
							container.StateCSS = 'success';
							break;
						case 'exited':
							container.StateCSS = 'danger';
							break;
						case 'created':
							container.StateCSS = 'primary';
							break;
						case 'restarting':
							container.StateCSS = 'warning';
							break;
						default:
							container.StateCSS = 'default';
							break;
					}
					if( -1 != data[i].Image.indexOf('sha256:')){
						var image = data[i].Image.substr(data[i].Image.indexOf('sha256:') + 7, 12);
						container["Image"] = image;
					}else{
						if( -1 != data[i].Image.indexOf('/')){
							var image = data[i].Image.split('/');
							container["Image"] = image[image.length - 1];							
						}else{
							if( data[i].Image.length > 16){
								container["Image"] = data[i].Image.substr(0, 8) + '...' + data[i].Image.substring(data[i].Image.length - 8, data[i].Image.length);
							}else{
								container["Image"] = data[i].Image;
							}
						}

					}

					container.Network = data[i]['NetworkSettings']['Networks'];

					container["fullPathImage"] = data[i].Image;

					container["Created"] = (new Date(data[i].Created * 1000)).toLocaleString();
					localContainers[container.Id] = container;
				}
				$scope.searchKeyUp();
			}).error(function(data, status, headers){
				if(-1 == status){
					$scope.status = '网络连接异常';
				}else{
					$scope.status = data;
				}
			});
	};

	$scope.selectAll = function(){
		if($scope.all){
			var cnt = 0;
			for(var c in $scope.containers){
				if($scope.verifyUser(c)){
					$scope.containers[c].Checked = true;
					cnt++;
				}
			}
			if( cnt > 0){
				$scope.multiOperatorButtonDisplay = true;
			}
		}else{
			for(var c in $scope.containers){
				if($scope.verifyUser(c)){
					$scope.containers[c].Checked = false;
				}
			}
			$scope.multiOperatorButtonDisplay = false;
		}
	};

	$scope.selectOne = function(){
		var cnt = 0;
		for(var c in $scope.containers){
			if($scope.containers[c].Checked){
				cnt++;
			}
		}

		if( 0 == cnt){
			$scope.multiOperatorButtonDisplay = false;
			$scope.all = false;
		}else{
			$scope.multiOperatorButtonDisplay = true;
			var myContainerNum = 0;
			for(var c in $scope.containers){
				if($scope.verifyUser(c)){
					myContainerNum++;
				}
			}
			if( myContainerNum == cnt){
				$scope.all = true;
			}else{
				$scope.all = false;
			}
		}
	};

	$scope.searchKeyUp = function(){
		if('' != $scope.filterWord){
			var tmpList = {};
			var filterByKey = function(keys){
				var keyword = '';
				if( -1 != $scope.filterWord.indexOf(':')){
					keyword = $scope.filterWord.split(':')[1].toLowerCase();
				}else{
					keyword = $scope.filterWord;
				}
				for (var k = keys.length - 1; k >= 0; k--) {
					for(var c in localContainers){
						if('Network' == keys[k]){
							for(var n in localContainers[c][keys[k]]){
								if(-1 != n.toLowerCase().indexOf(keyword)){
									tmpList[c] = localContainers[c];
									break;
								}
							}
						}else if('IP' == keys[k]){
							for(var n in localContainers[c]['Network']){
								if(-1 != localContainers[c]['Network'][n].IPAddress.indexOf(keyword.trim())){
									tmpList[c] = localContainers[c];
									break;
								}
							}
						}else if('fullPathImage' == keys[k]){
							if(-1 == localContainers[c]['fullPathImage'].indexOf('sha256:')){
								if(-1 != localContainers[c]['fullPathImage'].indexOf(keyword.trim())){
									tmpList[c] = localContainers[c];
									continue;
								}
							}
						}else{
							if( -1 != localContainers[c][keys[k]].toLowerCase().indexOf(keyword)){
								tmpList[c] = localContainers[c];
								continue;
							}
						}
					}
				}
			}

			if( -1 != $scope.filterWord.indexOf("=")){
				var labelStore = [];
				var labels = $scope.filterWord.split(',');
				for (var i = labels.length - 1; i >= 0; i--) {
					var kv = labels[i].split('=');
					if( 2 == kv.length){
						labelStore.push([kv[0],kv[1]]);
					}
				}
				for(var c in localContainers){
					var ok = false;
					for (var j = labelStore.length - 1; j >= 0; j--) {
						if(localContainers[c].Labels[labelStore[j][0]] == labelStore[j][1]){
							ok = true;
							break;
						}
					}
					if(ok){
						tmpList[c] = localContainers[c];
					}
				}
			}else if(-1 != $scope.filterWord.indexOf(":")){
				var key = $scope.filterWord.split(':')[0];
				switch(key.toLowerCase()){
					case 'name':
						filterByKey(['Name']);
						break;
					case 'image':
						filterByKey(['fullPathImage']);
						break;
					case 'network':
						filterByKey(['Network']);
						break;
					case 'ip':
						filterByKey(['IP']);
						break;
					case 'status':
						filterByKey(['Status', 'State']);
						break;
					case 'owner':
					case 'creator':
						filterByKey(['Owner']);
						break;
					default:
					break;
				}
			}else{
				filterByKey(['Name', 'Network', 'Status', 'fullPathImage', 'State', 'IP', 'Owner']);
			}
			$scope.containers = tmpList;
		}else{
			$scope.containers = localContainers;
		}
	};

	$scope.startMulti = function(){
		for(var c in $scope.containers){
			if($scope.containers[c].Checked){
				$scope.containerStart(c);
			}
		}
	};

	$scope.stopMulti = function(){
		for(var c in $scope.containers){
			if($scope.containers[c].Checked){
				$scope.containerStop(c);
			}
		}
	};

	$scope.restartMulti = function(){
		for(var c in $scope.containers){
			if($scope.containers[c].Checked){
				$scope.containerRestart(c);
			}
		}
	};

	$scope.removeMulti = function(){
		for(var c in $scope.containers){
			if($scope.containers[c].Checked){
				$scope.containerRemove(c, true);
			}
		}
	};

	$scope.containerStart = function(Id){
		if(!$scope.verifyUser(Id)){
			toastr.warn(`您无权操作容器${$scope.containers[Id].Name}`);
			return;
		}
		dockerService.containerStart(localStorage.dockerIP, localStorage.dockerPort, Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				if(304 == status){
					$scope.refresh();
					console.log(`${$scope.containers[Id].Name} is alreay started.`);
				}else{
					toastr.error('启动容器失败, 状态码:' + status + ' ' + data);
				}
			});
	};

	$scope.containerRestart = function(Id){
		if(!$scope.verifyUser(Id)){
			toastr.warn(`您无权操作容器${$scope.containers[Id].Name}`);
			return;
		}
		dockerService.containerRestart(localStorage.dockerIP, localStorage.dockerPort, Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				toastr.error('重启容器失败, 状态码:' + status + ' ' + data);
			});
	};

	$scope.containerStop = function(Id){
		if(!$scope.verifyUser(Id)){
			toastr.warn(`您无权操作容器${$scope.containers[Id].Name}`);
			return;
		}
		dockerService.containerStop(localStorage.dockerIP, localStorage.dockerPort, Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				if(304 == status){
					$scope.refresh();
					console.log(`${$scope.containers[Id].Name} is alreay stopped.`);
				}else{
					toastr.error('停止容器失败, 状态码:' + status + ' ' + data);
				}
			});
	};

	$scope.containerRemove = function(Id, Sure){
		if(!$scope.verifyUser(Id)){
			toastr.warn(`您无权操作容器${$scope.containers[Id].Name}`);
			return;
		}

		if(undefined == Sure){
			Sure = confirm(`确定删除容器 ${$scope.containers[Id].Name} 吗?`);
		}

		if(Sure){
			dockerService.containerRemove(localStorage.dockerIP, localStorage.dockerPort, Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				toastr.error('删除容器失败, 状态码:' + status + ' ' + data);
			});
		}
	};

	$scope.containerInspect = function(Id){
			remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'containerInspect', Id:Id});
	};

	$scope.imageInspect = function(id){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'imageInspect', Id:id});
	};
	
	$scope.containerCreate = function(){
      var win = new BrowserWindow({
        width: 960, 
        height: 620,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/containerCreate.html`);
	};

	$scope.containerClone = function(id){
      var win = new BrowserWindow({
        width: 960, 
        height: 620,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/containerClone.html?cloneSrcId=${id}`);
	};

	$scope.containerUpdate = function(name){
      var win = new BrowserWindow({
        width: 960, 
        height: 620,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/containerUpdate.html?srcContainerName=${name}`);
	};

	$scope.verifyUser = function(containerId){
		if(undefined == containerId){
			console.log('verifyUser needs containerId.');
			return false;
		}
		if('Administrator' == localStorage.userName){
			return true;
		}
		
		if($scope.containers[containerId].Owner == localStorage.userName){
			return true;
		}else{
			return false;
		}
	};
	$scope.refresh();
});