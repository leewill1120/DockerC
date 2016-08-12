const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('networkController',function($scope, toastr,dockerService){
	var localnetworks = {};
	$scope.networks = {};
	$scope.status = "Loading...";
	$scope.multiOperatorButtonDisplay = false;
	$scope.all = false;
	$scope.filterWord =  "";

	$scope.refresh = function(){
		dockerService.networkList(localStorage.dockerIP, localStorage.dockerPort)
			.success(function(data, status, headers){
				$scope.status = "";
				$scope.networks = {};
				localnetworks = {};
				for (var i = 0; i < data.length; i++) {
					var Id = data[i].Id.substr(0, 12);
					var network = {
						Id:Id,
						Name: data[i].Name,
						Driver: data[i].Driver,
						Scope: data[i].Scope,
						Containers: data[i].Containers,
						Options: data[i].Options,
						IPAM: data[i].IPAM,
						Owner: data[i].Options['DOCKERC_OWNER'] == undefined ? '' : data[i].Options['DOCKERC_OWNER'],
						Checked:false
					};
					if(0 == data[i]['IPAM']['Config'].length){
						network['Subnet'] = 'N/A';
					}else{
						network['Subnet'] = data[i]['IPAM']['Config'][0].Subnet;
					}
					localnetworks[Id] = network;
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
	$scope.networkInspect = function(Id){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'networkInspect', Id:Id});
	};

	$scope.networkRemove = function(Id, sure){
		if(undefined == sure){
			sure = confirm('确定删除网络' + Id + '吗?');
		}
		if(sure){
			dockerService.networkRemove(localStorage.dockerIP, localStorage.dockerPort, Id)
				.success(function(data, status, headers){
					$scope.refresh();
				}).error(function(data, status, headers){
					toastr.error(data + '状态码:' + status);
				});
		}
	};

	$scope.selectAll = function(){
		if($scope.all){
			var cnt = 0;
			for (var i in $scope.networks) {
				$scope.networks[i].Checked = true;
				cnt++;
			}
			if( cnt > 0){
				$scope.multiOperatorButtonDisplay = true;
			}
		}else{
			for (var i in $scope.networks) {
				$scope.networks[i].Checked = false;
			}
			$scope.multiOperatorButtonDisplay = false;
		}
	};

	$scope.selectOne = function(){
		var cnt = 0;
		for (var i in $scope.networks) {
			if($scope.networks[i].Checked){
				cnt++;
			}
		}

		if( 0 == cnt){
			$scope.multiOperatorButtonDisplay = false;
			$scope.all = false;
		}else{
			$scope.multiOperatorButtonDisplay = true;
			if( getAttrNum($scope.networks) == cnt){
				$scope.all = true;
			}else{
				$scope.all = false;
			}
		}
	};

	$scope.searchKeyUp = function(){
		$scope.networks = {};
		for (var i in localnetworks) {
			if( -1 != localnetworks[i].Name.toLowerCase().indexOf($scope.filterWord.toLowerCase())){
				$scope.networks[i] = localnetworks[i];
			}
		}
	};

	$scope.removeMulti = function(){
		for (var i in $scope.networks) {
			if($scope.networks[i].Checked){
				$scope.networkRemove($scope.networks[i].Id, true);
			}
		}
	};

	$scope.networkCreate = function(){
      var win = new BrowserWindow({
        width: 800, 
        height: 550,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/networkCreate.html`);
	};

	$scope.refresh();
});