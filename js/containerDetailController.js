const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;

var myApp = angular.module('myApp',['toastr']);
const cacheLength = 3600;
const defaultStartShowIndex = cacheLength - 60;

myApp.filter('alterName', function(){
	return alterName;
});

var alterName = function(input){
	if(undefined == input){
		return;
	}
	if('/' == input[0]){
		return input.substr(1);
	}else{
		return input;
	}
}

myApp.controller('containerDetailController',function($scope, toastr, dockerService){
	$scope.summaryDisplay = "display";
	$scope.envDisplay = "none";
	$scope.volumeDisplay = "none";
	$scope.moreDisplay = "none";
	$scope.moreShowWord = "更多";
	$scope.containerId = remote.getGlobal('sharedObject').containerId;
	$scope.logsShowWord = "日志";

	$scope.memShow = "usage";
	$scope.cpuShowScope = "60";
	$scope.memShowScope = "60";
	$scope.netShowScope = "60";
	$scope.selectedInterface = undefined;
	$scope.btnPause = '';
	$scope.showButtonGroup = false;

	$scope.stats_data = {
		time:{
			full:[],
			show:[]
		},
		cpu:{
			graphHandle:undefined,
			startShowIndex: defaultStartShowIndex,
			percent:[]
		},
		mem:{
			graphHandle:undefined,
			startShowIndex: defaultStartShowIndex,
			usage:{
				name:'内存使用量',
				color:'rgb(0, 158, 0)',
				unit:'MB',
				data:[]
			},
			percent:{
				name:'内存使用率',
				color:'rgb(0, 158, 158)',
				unit:'%',
				data:[]
			}
		},
		net:{
			graphHandle:undefined,
			startShowIndex: defaultStartShowIndex,
			interfaces:{}
		},
		blkio:{}
	};

	for (var i = 0; i < cacheLength; i++) {
		$scope.stats_data.time.show.push(0);
		$scope.stats_data.time.full.push(0);
		$scope.stats_data.cpu.percent.push(0);
		$scope.stats_data.mem.usage.data.push(0);
		$scope.stats_data.mem.percent.data.push(0);
	}
	var option = {
		title:{},
	    tooltip: {
	        trigger: 'axis',
	        position: function (pt) {
	            return [pt[0], '10%'];
	        }
	    },
	    xAxis: {
			name:'时间',
	        type: 'category',
	        boundaryGap: false,
	        data: $scope.stats_data.time.show.slice(defaultStartShowIndex, cacheLength)
	    },
	    yAxis: {
	        boundaryGap: [0, '50%'],
	        type: 'value'
	    },
        toolbox: {
	        show: true,
	        feature: {
	            dataZoom: {
	                yAxisIndex: 'none'
	            },
	            dataView: {readOnly: false},
	            restore: {},
	            saveAsImage: {}
	        }
	    },
	    series: []
	};

	$scope.openCPUStats = function(){
		$('#collapseCPU').collapse('toggle');
		if(undefined == $scope.stats_data.cpu.graphHandle)
		{
			$scope.stats_data.cpu.graphHandle = echarts.init(document.getElementById('cpu_stats'));
		}else{
			delete $scope.stats_data.cpu.graphHandle;
		}
	};
	$scope.openMemStats = function(){
		$('#collapseMem').collapse('toggle');
		if(undefined == $scope.stats_data.mem.graphHandle)
		{
			$scope.stats_data.mem.graphHandle = echarts.init(document.getElementById('mem_stats'));
		}else{
			delete $scope.stats_data.mem.graphHandle;
		}
	};

	$scope.openNetStats = function(){
		$('#collapseNet').collapse('toggle');
		if(undefined == $scope.stats_data.net.graphHandle)
		{
			$scope.stats_data.net.graphHandle = echarts.init(document.getElementById('net_stats'));
		}else{
			delete $scope.stats_data.net.graphHandle;
		}
	};

	$scope.showScopeChange = function(item){
		switch(item){
			case 'cpu':
				$scope.stats_data.cpu.startShowIndex = cacheLength - $scope.cpuShowScope;
				break;
			case 'mem':
				$scope.stats_data.mem.startShowIndex = cacheLength - $scope.memShowScope;
				break;
			case 'net':
				$scope.stats_data.net.startShowIndex = cacheLength - $scope.netShowScope;
				break;
			default:
				console.log('unknow item:' + item);
				break;
		}
	};

	$scope.refresh = function(){
		var networks = {};
		$scope.networkName = '';

		dockerService.containerInspect(localStorage.dockerIP, localStorage.dockerPort, $scope.containerId)
			.success(function(data, status, headers){
				$scope.Info = data;
				dockerService.networkList(localStorage.dockerIP, localStorage.dockerPort)
					.success(function(data, status, headers){
						for (var i = data.length - 1; i >= 0; i--) {
							networks[data[i].Id] = data[i];
						}
						
						$scope.Info['Owner'] = $scope.Info.Config.Labels['DOCKERC_OWNER'] == undefined ? '' : $scope.Info.Config.Labels['DOCKERC_OWNER'];
						if('default' == $scope.Info.HostConfig.NetworkMode){
							$scope.Info.HostConfig.NetworkMode = 'bridge';
						}
						//获取网络名称
						if(undefined == networks[$scope.Info.HostConfig.NetworkMode]){
							//认为NetworkMode是网络名称
							$scope.networkName = $scope.Info.HostConfig.NetworkMode;
						}else{
							//是ID
							$scope.networkName = networks[$scope.Info.HostConfig.NetworkMode].Name;
						}
						
						$scope.Info["Created_ex"] = (new Date($scope.Info.Created)).toLocaleString();
						if($scope.Info.State.Paused){
							$scope.btnPause = "恢复";
						}else{
							$scope.btnPause = "暂停";
						}
						if(true == $scope.Info.State.Running){
							$scope.status = "success";
						}else if(true == $scope.Info.State.Paused){
							$scope.status = "default";
						}else if(true == $scope.Info.State.Restarting){
							$scope.status = "warning";
						}else if(true == $scope.Info.State.OOMKilled){
							$scope.status = "danger";
						}else if(true == $scope.Info.State.Dead){
							$scope.status = "danger";
						}else{
							if(-1 != $scope.Info.State.Status.indexOf('exited')){
								$scope.status = "danger";
							}else{
								$scope.status = "info";
							}
						}

						//校验用户
						if($scope.verifyUser($scope.Info.Id)){
							$scope.showButtonGroup = true;
						}
					}).error(function(data, status, headers){
						toastr.error(`获取网络列表失败,${status},${data}`);
						return;
					});
			}).error(function(data, status, headers){
				toastr.error('inspect container failed.')
			});

		dockerService.containerStats(localStorage.dockerIP, localStorage.dockerPort, $scope.containerId, function(res){
			res.setEncoding('utf8');
			var cache = '';
			res.on('data', (chunk) =>{
				try{
					var stats = JSON.parse(cache + chunk);
					cache = '';

					//获取日期
					var d = new Date(stats.read);
					$scope.stats_data.time.full.push(d);
					$scope.stats_data.time.show.push(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
					$scope.stats_data.time.full.shift();
					$scope.stats_data.time.show.shift();

					//获取cpu使用率
					var container_cpu_usage = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
					var system_cpu_usage = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
					$scope.stats_data.cpu.percent.push((100 * container_cpu_usage / system_cpu_usage).toFixed(2));
					$scope.stats_data.cpu.percent.shift();

					//获取内存使用量
					$scope.stats_data.mem.usage.data.push((stats.memory_stats.usage / 1024 / 1024).toFixed(2));
					$scope.stats_data.mem.percent.data.push((100 * stats.memory_stats.usage / stats.memory_stats.limit).toFixed(2));
					$scope.stats_data.mem.usage.data.shift();
					$scope.stats_data.mem.percent.data.shift();

					//获取各个网口收发速率
					for(var i in stats.networks){

						//首先判断该网口是否存在,不存在则创建并初始化
						if(undefined == $scope.stats_data.net.interfaces[i]){
							$scope.stats_data.net.interfaces[i] = {
								rx_bytes:[],
								rx_dropped: [],
								rx_errors: [],
								rx_packets: [],
								tx_bytes: [],
								tx_dropped: [],
								tx_errors: [],
								tx_packets: [],
								rx_bytes_rate:[],
								tx_bytes_rate:[]
							};
							if(undefined == $scope.selectedInterface){
								$scope.selectedInterface = $scope.stats_data.net.interfaces[i];
							}

							for (var j = 0; j < cacheLength; j++) {
								$scope.stats_data.net.interfaces[i].rx_bytes.push(0);
								$scope.stats_data.net.interfaces[i].rx_dropped.push(0);
								$scope.stats_data.net.interfaces[i].rx_errors.push(0);
								$scope.stats_data.net.interfaces[i].rx_packets.push(0);
								$scope.stats_data.net.interfaces[i].tx_bytes.push(0);
								$scope.stats_data.net.interfaces[i].tx_dropped.push(0);
								$scope.stats_data.net.interfaces[i].tx_errors.push(0);
								$scope.stats_data.net.interfaces[i].tx_packets.push(0);
								$scope.stats_data.net.interfaces[i].rx_bytes_rate.push(0);
								$scope.stats_data.net.interfaces[i].tx_bytes_rate.push(0);
							}
						}

						//数据入缓存
						$scope.stats_data.net.interfaces[i].rx_bytes.push(stats.networks[i].rx_bytes);
						$scope.stats_data.net.interfaces[i].rx_dropped.push(stats.networks[i].rx_dropped);
						$scope.stats_data.net.interfaces[i].rx_errors.push(stats.networks[i].rx_errors);
						$scope.stats_data.net.interfaces[i].rx_packets.push(stats.networks[i].rx_packets);
						$scope.stats_data.net.interfaces[i].tx_bytes.push(stats.networks[i].tx_bytes);
						$scope.stats_data.net.interfaces[i].tx_dropped.push(stats.networks[i].tx_dropped);
						$scope.stats_data.net.interfaces[i].tx_errors.push(stats.networks[i].tx_errors);
						$scope.stats_data.net.interfaces[i].tx_packets.push(stats.networks[i].tx_packets);
						$scope.stats_data.net.interfaces[i].rx_bytes.shift();
						$scope.stats_data.net.interfaces[i].rx_dropped.shift();
						$scope.stats_data.net.interfaces[i].rx_errors.shift();
						$scope.stats_data.net.interfaces[i].rx_packets.shift();
						$scope.stats_data.net.interfaces[i].tx_bytes.shift();
						$scope.stats_data.net.interfaces[i].tx_dropped.shift();
						$scope.stats_data.net.interfaces[i].tx_errors.shift();
						$scope.stats_data.net.interfaces[i].tx_packets.shift();

						//计算速率并缓存
						var rx_bytes_rate = ($scope.stats_data.net.interfaces[i].rx_bytes[cacheLength - 1] - $scope.stats_data.net.interfaces[i].rx_bytes[cacheLength - 2]) / ($scope.stats_data.time.full[cacheLength - 1] - $scope.stats_data.time.full[cacheLength - 2]) * 1000 / 1024;
						var tx_bytes_rate = ($scope.stats_data.net.interfaces[i].tx_bytes[cacheLength - 1] - $scope.stats_data.net.interfaces[i].tx_bytes[cacheLength - 2]) / ($scope.stats_data.time.full[cacheLength - 1] - $scope.stats_data.time.full[cacheLength - 2]) * 1000 / 1024;
						$scope.stats_data.net.interfaces[i].rx_bytes_rate.push(rx_bytes_rate.toFixed(2));
						$scope.stats_data.net.interfaces[i].tx_bytes_rate.push(tx_bytes_rate.toFixed(2));
						$scope.stats_data.net.interfaces[i].rx_bytes_rate.shift();
						$scope.stats_data.net.interfaces[i].tx_bytes_rate.shift();
					}

					//更新图表内容
					if(undefined != $scope.stats_data.cpu.graphHandle){
						var series = [
					        {
					            name:'CPU使用率',
					            type:'line',
					            smooth:true,
					            symbol: 'none',
					            itemStyle: {
					                normal: {}
					            },
					            areaStyle: {
					                normal: {
					                	color:'rgb(255, 158, 0)'
					                }
					            },
					            data: $scope.stats_data.cpu.percent.slice($scope.stats_data.cpu.startShowIndex, cacheLength)
					        }
					    ];
					    option.xAxis.data = $scope.stats_data.time.show.slice($scope.stats_data.cpu.startShowIndex, cacheLength);
					    option.yAxis.name = '(%)';
					    option.title = {};
						option.series = series;
						$scope.stats_data.cpu.graphHandle.setOption(option);
					}
					if(undefined != $scope.stats_data.mem.graphHandle){
						var series = [
					        {
					            name:$scope.stats_data.mem[$scope.memShow].name,
					            type:'line',
					            smooth:true,
					            symbol: 'none',
					            areaStyle: {
					                normal: {
					                	color:$scope.stats_data.mem[$scope.memShow].color
					                }
					            },
					            data: $scope.stats_data.mem[$scope.memShow].data.slice($scope.stats_data.mem.startShowIndex, cacheLength)
					        }
					    ];

					    option.xAxis.data = $scope.stats_data.time.show.slice($scope.stats_data.mem.startShowIndex, cacheLength);
					    option.yAxis.name = `(${$scope.stats_data.mem[$scope.memShow].unit})`;
					    option.title = {};
						option.series = series;
						$scope.stats_data.mem.graphHandle.setOption(option);
					}
					if(undefined != $scope.stats_data.net.graphHandle){
							var series = [
						        {
						            name:'接收速率',
						            type:'line',
						            smooth:true,
						            symbol: 'none',
						            itemStyle: {
					                	normal: {
					                		color:'rgb(255, 0,0)'
					                	}
					            	},
						            data: $scope.selectedInterface.rx_bytes_rate.slice($scope.stats_data.net.startShowIndex, cacheLength)
						        },
						        {
						            name:'发送速率',
						            type:'line',
						            smooth:true,
						            symbol: 'none',
						            itemStyle: {
					                	normal: {
					                		color:'rgb(0, 128, 64)'
					                	}
					            	},
						            data: $scope.selectedInterface.tx_bytes_rate.slice($scope.stats_data.net.startShowIndex, cacheLength)
						        }
						    ];
						    option.yAxis.name = '(KB/s)';
						    option.xAxis.data = $scope.stats_data.time.show.slice($scope.stats_data.net.startShowIndex, cacheLength);
							option.series = series;
							$scope.stats_data.net.graphHandle.setOption(option);
					}
				}catch(e){
					if(e instanceof SyntaxError){
						cache += chunk;
					}else{
						console.log(e);
					}
				}
			});
			res.on('end', () => {
			    console.log('No more data in response.')
			});

		});
	};
	$scope.goBack =  function(){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'goBack'});
	};

	$scope.openConsole =  function(){
      var win = new BrowserWindow({
        	frame:false,
        	resizable:true
      });
      win.loadURL(`file://${__dirname}/../html/console.html?containerId=${$scope.Info.Id}`);
	};

	$scope.envClick = function(){
		if("none" == $scope.envDisplay){
			$scope.envDisplay = "display";
		}else{
			$scope.envDisplay = "none";
		}
	};

	$scope.volumeClick = function(){
		if("none" == $scope.volumeDisplay){
			$scope.volumeDisplay = "display";
		}else{
			$scope.volumeDisplay = "none";
		}
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

	$scope.containerStart = function(){
		dockerService.containerStart(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				toastr.error(data);
			});
	};

	$scope.containerPause = function(){
		if('暂停' == $scope.btnPause){
			dockerService.containerPause(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
				.success(function(data, status, headers){
					$scope.refresh();
				}).error(function(data, status, headers){
					toastr.error(data);
				});
		}else{
			dockerService.containerUnpause(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
				.success(function(data, status, headers){
					$scope.refresh();
				}).error(function(data, status, headers){
					toastr.error(data);
				});
		}
	};

	$scope.containerRestart = function(){
		dockerService.containerRestart(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				toastr.error(data);
			});
	};

	$scope.containerStop = function(){
		dockerService.containerStop(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
			.success(function(data, status, headers){
				$scope.refresh();
			}).error(function(data, status, headers){
				toastr.error(data);
			});
	};

	$scope.containerRemove = function(Sure){
		if(undefined == Sure){
			Sure = confirm('确定删除容器' + $scope.Info.Name + '吗?');
		}

		if(Sure){
			dockerService.containerRemove(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
				.success(function(data, status, headers){
					toastr.success('删除成功');
					$scope.goBack();
				}).error(function(data, status, headers){
					toastr.error(data);
				});
		}
	};

	$scope.logs = function(){
		if("日志" == $scope.logsShowWord){
			$scope.logsShowWord = "收起";
			$scope.summaryDisplay = "none";
			$scope.moreDisplay = "display";
			$scope.TextArea = "Loading..."
			dockerService.containerLogs(localStorage.dockerIP, localStorage.dockerPort, $scope.Info.Id)
				.success(function(data, status, headers){
					$scope.TextArea = data;
				}).error(function(data, status, headers){
					$scope.TextArea = data;
				});
		}else{
			$scope.logsShowWord = "日志";
			$scope.moreDisplay = "none";
			$scope.summaryDisplay = "display";
		}
	};

	$scope.verifyUser = function(containerId){
		if(undefined == containerId){
			console.log('verifyUser needs containerId.');
			return false;
		}
		if('Adminitrator' == localStorage.userName){
			return true;
		}
		
		if($scope.Info.Owner == localStorage.userName){
			return true;
		}else{
			return false;
		}
	};

	$scope.refresh();
	$scope.openCPUStats();
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