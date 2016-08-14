const electron = nodeRequire('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const BrowserWindow = remote.BrowserWindow;

var myApp = angular.module('myApp',['toastr']);

myApp.controller('imageController',function($scope, toastr, dockerService){
	var localImages = {};
	$scope.images = {};
	$scope.status = "Loading...";
	$scope.progressDisplay = "none";
	$scope.text = "";
	$scope.pullingImage = "";
	$scope.multiOperatorButtonDisplay = false;
	$scope.all = false;
	$scope.pullButton = "开始";
	$scope.filterWord = "";

	$scope.refresh = function(){
		dockerService.imageList(localStorage.dockerIP, localStorage.dockerPort)
			.success(function(data, status, headers){
				localImages = {};
				$scope.images = {};
				$scope.status = "";
				for (var i = 0; i < data.length; i++) {
					var image = {
						Id: data[i].Id.split(':')[1].substr(0, 12),
						RepoTags: data[i].RepoTags,
						Created: new Date(data[i].Created * 1000).toLocaleString(),
						Size: Math.round(data[i].Size / 1024 / 1024) + ' MB',
						Labels: data[i].Labels,
						Status:'',
						Checked:false
					};
					localImages[image.Id] = image;
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

	$scope.imagePull = function(){
		$scope.text = [];
		$scope.pullButton = "正在拉取";

		$scope.progressDisplay = "display";
		try{
			dockerService.imageCreate(localStorage.dockerIP, localStorage.dockerPort, $scope.pullingImage, function(res){
				res.setEncoding('utf8');
				res.on('data', (chunk) =>{
					var json = JSON.parse(chunk);
					if(undefined != json.status){
						$scope.text.push({text:json.status});
					}
					$scope.$apply();
				});

				res.on('end', () => {
				    $scope.progressDisplay = "none";
				    $scope.pullButton = "完成";
				    $scope.refresh();
				    $scope.$apply();
				});
			});
		}catch(e){
			$scope.progressDisplay = "none";
			$scope.text.push({text:e.message});
			$scope.pullButton = "开始";
		}
	};

	$scope.imageInput = function(){
		if($scope.pullButton != "正在拉取"){
			$scope.pullButton = "开始";
			$scope.text = [];
		}

	};

	$scope.closeImagePull = function(){
		$scope.pullButton = "开始";
		$scope.text = [];
		$scope.pullingImage = "";
	};

	$scope.imageRemove = function(id, sure){
		if(undefined == sure){
			sure = confirm('确定删除镜像' + id + '吗?')
		}
		if(sure){
			$scope.images[id].Status = '(删除中)';
			dockerService.imageRemove(localStorage.dockerIP, localStorage.dockerPort, id)
				.success(function(data, status, headers){
					$scope.refresh();
				}).error(function(data, status, headers){
					$scope.images[id].Status = '';
					toastr.error(data.message + '状态码:' + status);
				});
		}
	};

	$scope.imageInspect = function(id){
		remote.getCurrentWindow().webContents.send('asyncchannel', {cmd:'imageInspect', Id:id});
	};

	$scope.selectAll = function(){
		if($scope.all){
			var cnt = 0;
			for(var i in $scope.images){
				$scope.images[i].Checked = true;
				cnt++;
			}
			if( cnt > 0){
				$scope.multiOperatorButtonDisplay = true;
			}
		}else{
			for(var i in $scope.images){
				$scope.images[i].Checked = false;
			}
			$scope.multiOperatorButtonDisplay = false;
		}
	};

	$scope.selectOne = function(){
		var cnt = 0;
		for(var i in $scope.images){
			if($scope.images[i].Checked){
				cnt++;
			}
		}

		if( 0 == cnt){
			$scope.multiOperatorButtonDisplay = false;
			$scope.all = false;
		}else{
			$scope.multiOperatorButtonDisplay = true;
			if( getAttrNum($scope.images) == cnt){
				$scope.all = true;
			}else{
				$scope.all = false;
			}
		}
	};

	$scope.removeMulti = function(){
		for(var i in $scope.images){
			if($scope.images[i].Checked){
				$scope.imageRemove(i, true);
			}
		}
	};

	$scope.searchKeyUp = function(){
		$scope.images = {};
		for(var img in localImages){
			for (var i = 0; i < localImages[img].RepoTags.length; i++) {
				if( -1 != localImages[img].RepoTags[i].toLowerCase().indexOf($scope.filterWord.toLowerCase())){
					$scope.images[img] = localImages[img];
				}
			}
		}
	};

	$scope.containerDeploy = function(imageName){
      var win = new BrowserWindow({
        width: 960, 
        height: 620,
        frame:false,
      });
      win.loadURL(`file://${__dirname}/../html/containerCreate.html?imageName=${imageName}`);
	}

	$scope.refresh();
});