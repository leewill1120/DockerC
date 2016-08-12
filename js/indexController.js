const electron = nodeRequire('electron');
const child_process = nodeRequire('child_process');
const nodeProcess = nodeRequire('process');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const shell = electron.shell;

const fs = nodeRequire('fs');
const crypto = nodeRequire('crypto');
const url = nodeRequire('url');
const http = nodeRequire('http');
const path = nodeRequire('path');

var myApp = angular.module('myApp',['ui.bootstrap', 'toastr']);
myApp.controller('indexController',function($scope, $http, $uibModal, toastr, dockerService){
	if(undefined == localStorage.headerColor){
		localStorage.headerColor = '5c5cff';
	}

	if(undefined == localStorage.userName){
		localStorage.userName = '';
	}
	if(undefined == localStorage.dockerIP){
		localStorage.dockerIP = '';
	}
	if(undefined == localStorage.dockerPort){
		localStorage.dockerPort = '4000';
	}
	if(undefined == localStorage.enableTLS){
		localStorage.enableTLS = false;
	}
	if(undefined == localStorage.dockersURL){
		localStorage.dockersURL = 'http://docker.hscloud.cn:4021/dockers';
	}

	if('' == localStorage.userName || '' == localStorage.dockerIP || '' == localStorage.dockerPort){
		setTimeout(openSetting, 3000);
	}

	if("" == localStorage.dockerIP || "" == localStorage.dockerPort){
		$scope.APIAddress = "";
	}else{
		$scope.APIAddress = `${localStorage.dockerIP}:${localStorage.dockerPort}`;
	}

	$scope.headerColor = localStorage.headerColor;
	$scope.webview = document.getElementById("mywebview");
	$scope.summarySelect = 'selected';
	$scope.containerSelect = '';
	$scope.imageSelect = '';
	$scope.networkSelect = '';
	$scope.volumeSelect = '';
	$scope.clusterSelect = '';
	$scope.toolSelect = '';

	ipcRenderer.on('asyncchannel', function(event, message){
		switch(message.cmd){
			case 'networkInspect':
				remote.getGlobal('sharedObject').networkId = message.Id;
				//$scope.webview.openDevTools();
				$scope.webview.loadURL(`${__dirname}/html/networkDetail.html`);
				break;
			case 'goBack':
				$scope.webview.goBack();
				break;
			case 'containerInspect':
				//$scope.webview.openDevTools();
				remote.getGlobal('sharedObject').containerId = message.Id;
				$scope.webview.loadURL(`${__dirname}/html/containerDetail.html`);
				break;
			case 'imageInspect':
				//$scope.webview.openDevTools();
				remote.getGlobal('sharedObject').imageId = message.Id;
				$scope.webview.loadURL(`${__dirname}/html/imageDetail.html`);
				break;
			default:
				console.log('Unknow cmd:' + message.cmd)
				break;
		}
	});

	clearSelect = function(){
		$scope.summarySelect = '';
		$scope.containerSelect = '';
		$scope.imageSelect = '';
		$scope.networkSelect = '';
		$scope.volumeSelect = '';
		$scope.clusterSelect = '';
		$scope.toolSelect = '';
	};

	$scope.debugWebView = function(){
		$scope.webview.openDevTools();
	};

	$scope.openSummaryPage = function(){
		//$scope.webview.openDevTools();
		clearSelect();
		$scope.summarySelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/summary.html`);
	};

	$scope.openContainerPage = function(){
		//$scope.webview.openDevTools();
		clearSelect();
		$scope.containerSelect = 'selected';
  		$scope.webview.loadURL(`${__dirname}/html/container.html`);
	};

	$scope.openImagePage = function(){
		clearSelect();
		//$scope.webview.openDevTools();
		$scope.imageSelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/image.html`);
	};

	$scope.openNetworkPage = function(){
		clearSelect();
		//$scope.webview.openDevTools();
		$scope.networkSelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/network.html`);
	};

	$scope.openVolumePage  = function(){
		clearSelect();
		//$scope.webview.openDevTools();
		$scope.volumeSelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/volume.html`);
	};

	$scope.openClusterPage  = function(){
		clearSelect();
		//$scope.webview.openDevTools();
		$scope.clusterSelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/cluster.html`);
	};

	$scope.openToolPage = function(){
		clearSelect();
		$scope.toolSelect = 'selected';
		$scope.webview.loadURL(`${__dirname}/html/tool.html`);
	};

	$scope.setting = function(){
		openSetting();
	};

	$scope.quit = function(){
		if(true == confirm('确定退出吗?')){
			remote.app.quit();
		}
	}

	$scope.minimize = function(){
		remote.getCurrentWindow().minimize();
	}

	$scope.maximize = function(){
		if(true == remote.getCurrentWindow().isMaximized()){
			remote.getCurrentWindow().unmaximize();
		}else{
			remote.getCurrentWindow().maximize();
		}
	};

	$scope.about = function(){
		alert(`NodeJS version: ${nodeProcess.version}\nApp Version: ${$scope.version}\nbuilder: liwei18311\nE-mail: liwei18311@hundsun.com`);
	};

	$scope.help = function(){
		var win = new BrowserWindow({
	        width: 960, 
	        height: 620,
	        frame:false,
		});
		win.loadURL(`file://${__dirname}/html/help.html`);
	};

	$scope.updateCheck = function(startUp){
		$http({
			method:'GET',
			headers:{
				'Cache-Control': 'no-cache'
			},
			url: localStorage.dockersURL + '/update'
		}).success(function(data, status, headers){
			if(status >= 400 && status < 600){
				console.log(data);
				return;
			}
			if(updateCheckInfoVerify(data)){
				if(compareVersion($scope.version, data.version)){
					//检测到新版本
					var msg = `版本:${data.version}\n描述:\n`;
					for (var i = 0; i < data.description.length; i++) {
						msg += `${i+1}、${data.description[i]}\n`;
					}
					var ret = remote.dialog.showMessageBox({
				            title:'检测到新版本',
				            type:'info',
				            buttons:['升级','取消'],
				            defaultId:1,
				            cancelId:1,
				            detail:msg,
				          });
					switch(ret){
						case 0:
							//升级
							$scope.downloading = '正在升级...';
							//下载升级器
							var updaterSavePath = remote.app.getPath('temp') + '\\updater.exe';
							var updaterSavePath_tmp = updaterSavePath + '.downloading';
							downloadFile(localStorage.dockersURL + data.updater.url, updaterSavePath_tmp, function(err){
								if(err){
									$scope.downloading = '';
									$scope.$apply();
									console.log('下载升级器失败');
									toastr.error(`${err},升级失败`);
								}else{
									computeFileMd5sum(updaterSavePath_tmp, function(md5){
										if(md5.toLowerCase() == data.updater.md5sum.toLowerCase()){
											fs.rename(updaterSavePath_tmp, updaterSavePath, function(err){
												if(err){
													toastr.error(err);
												}else{
													//下载安装包
													var savePath = remote.app.getPath('temp') + `\\iDC-${data.version}.zip`;
													var savePath_tmp = savePath + '.downloading';
													downloadFile(localStorage.dockersURL + data.package.url, savePath_tmp, function(err){
														if(err){
															$scope.downloading = '';
															$scope.$apply();
															toastr.error(`${err},升级失败`);
														}else{
															computeFileMd5sum(savePath_tmp, function(md5){
																if(md5.toLowerCase() == data.package.md5sum.toLowerCase()){
																	$scope.downloading = "";
																	$scope.$apply();
																	fs.rename(savePath_tmp, savePath, function(err){
																		if(err){
																			toastr.error(err);
																		}else{
																			console.log(`升级包已下载 ${savePath}`);
																			var ret = remote.dialog.showMessageBox({
																			            title:'升级完成',
																			            type:'question',
																			            buttons:['立即重启','稍后重启'],
																			            defaultId:1,
																			            cancelId:1,
																			            detail:'升级完成，立即重启应用升级?',
																			          });
																				var path_array = remote.app.getAppPath().split('\\');
																				var installPath = path_array.slice(0, path_array.length - 2).join('/');

																				var processName = path.basename(nodeProcess.execPath);
																				console.log(`updaterSavePath:${updaterSavePath}`);
																				console.log(`processName:${processName}`);
																				console.log(`savePath:${savePath}`);
																				console.log(`installPath:${installPath}`);
																				if(ret == 0){
																					//立即重启
																					child_process.spawn(updaterSavePath, [processName, savePath, installPath, 'true'], {
																						detached:true
																					});
																					remote.app.quit();
																				}else{
																					//稍后重启
																					child_process.spawn(updaterSavePath, [processName, savePath, installPath, 'false'], {
																						detached:true
																					});
																				}
																		}
																	});
																}else{
																	$scope.downloading = "";
																	$scope.$apply();
																	toastr.error(`程序包md5校验值不匹配,升级失败`);
																	console.log('正确md5sum:' + data.package.md5sum.toLowerCase());
																}
															});
														}
													});
												}
											});
										}else{
											$scope.downloading = "";
											$scope.$apply();
											toastr.error(`升级器md5校验值不匹配,升级失败`);
										}
									});
								}
							});
							break;
						default:
							break;
					}
				}else{
					if(!startUp){
						toastr.info('当前已经是最新版本.');
					}
				}
			}else{
				console.log('更新检查返回信息校验失败');
			}
			
		}).error(function(data, status, headers){
			console.log('检查更新失败,' + data);
		});
	};

	$scope.gotoOfficialWeb = function(){
		shell.openExternal('http://docker.hscloud.cn');
	};

	//获取本地版本信息
	$scope.version = remote.app.getVersion();

	//升级检查
	setTimeout(function(){
		$scope.updateCheck(true);
	}, 3000);
});

function updateCheckInfoVerify(data){
	var ret = true;
	var fields = ['version', 'package', 'description', 'releaseDate', 'updater'];
	for (var i = 0; i < fields.length; i++) {
		if(undefined == data[fields[i]]){
			console.log(`更新检查返回信息校验不通过,缺少${fields[i]}`)
			ret = false;
		}else{
			if('package' == fields[i] || 'updater' == fields[i]){
				var subfileds = ['url', 'md5sum'];
				for (var j = 0; j < subfileds.length; j++) {
					if(undefined == data[fields[i]][subfileds[j]]){
						console.log(`更新检查返回信息校验不通过,缺少${fields[i]}.${subfileds[j]}`)
						ret = false;
					}
				}
			}
		}
	}

	return ret;
}

function openSetting(){
	var win = new BrowserWindow({frame:false});
	win.loadURL(`file://${__dirname}/html/setting.html`);
}

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

function computeFileMd5sum(filePath, callback){
    var start = new Date().getTime();
    var md5sum = crypto.createHash('md5');
    var stream = fs.createReadStream(filePath);
    stream.on('data', function(chunk) {
        md5sum.update(chunk);
    });
    stream.on('end', function() {
        str = md5sum.digest('hex').toUpperCase();
        console.log('文件:'+filePath+',MD5签名为:'+str+'.耗时:'+(new Date().getTime()-start)/1000.00+"秒");
        if(callback != undefined){
        	callback(str);
        }
    });
}