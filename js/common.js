function compareVersion(currentVersion, latestVersion){
	var iOld = parseInt(currentVersion.toString().split('.').join(''));
	var iNew = parseInt(latestVersion.toString().split('.').join(''));
	if(iNew > iOld){
		return true;
	}else{
		return false;
	}
}

function getAttrNum(obj){
	var num = 0;
	for(var a in obj){
		num++;
	}
	return num;
}

function getNodes(data){
	var nodes = {};
	if(undefined == data.SystemStatus){
		return undefined;
	}else{
		for (var i = 4; i < data.SystemStatus.length; i = i + 9) {
			var nodeName = data.SystemStatus[i][0].trim();
			var nodeAddress = data.SystemStatus[i][1].trim();
			nodes[nodeName] = {
				Name: nodeName,
				Address:nodeAddress
			};
			for (var j = 1; j < 9; j++) {
				var key = data.SystemStatus[i + j][0].split('└')[1].trim();
				var value = data.SystemStatus[i + j][1];
				nodes[nodeName][key] = value;
			}
		}
		return nodes;
	}
}

function ipToNumber(ip) {    
    var numbers = ip.split(".");    
    return parseFloat(numbers[0])*256*256*256 +     
    parseFloat(numbers[1])*256*256 +     
    parseFloat(numbers[2])*256 +     
    parseFloat(numbers[3]);    
}

function numberToIp(number) {    
    return (Math.floor(number/(256*256*256))) + "." +     
    (Math.floor(number%(256*256*256)/(256*256))) + "." +     
    (Math.floor(number%(256*256)/256)) + "." +     
    (Math.floor(number%256));    
}

function getNetNumber(subnet){
	var ip = subnet.split('/')[0];
	var mask = subnet.split('/')[1];

	var nMask = 0 >>> 0;
	for(var i = 32 - mask; i < 32; i++){
		nMask += Math.pow(2, i);
	}
	return (ipToNumber(ip) & nMask) >>> 0;
}

function getBroadCastNumber(subnet){
	var ip = subnet.split('/')[0];
	var mask = subnet.split('/')[1];

	var mMask = 0 >>> 0;
	for(var i = 0; i < 32 - mask; i++){
		mMask += Math.pow(2, i);
	}
	return (ipToNumber(ip) | mMask) >>> 0;
}