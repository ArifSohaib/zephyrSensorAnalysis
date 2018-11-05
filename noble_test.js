var noble = require("noble")

//check if the adapter is powered on then start scanning for devices
noble.on('stateChange', function(state){
	if(state=='poweredOn'){
		console.log('Powered on');
		noble.startScanning();
	}
});

//Register a function to recieve any newly discovered devices
noble.on('discover', function(device){
	console.log('Found device: ' + device.address);
	//check if this is the Zephyr HxM
	if(device.address ==='c8:fd:19:42:95:00'){
		console.log('Found Zephyr HxM');
		//Found the device, now connecting
		noble.stopScanning();
		device.connect(function(error){
			//once connected, we need to kick off service discovery
			device.discoverAllServicesAndCharacteristics(function(error, services, characteristics){
				//list all services
				services.forEach(function(sr, srID){
					console.log("Found service: " + sr.name + " with id: " + sr.uuid);
					//try connecting to the Generic Attribute service
					if(sr.uuid === '1801'){
					}
				});
				
				//service discovery complete, find the services we care about
				var heartRateCh = null;
				var activityCh = null;
				characteristics.forEach(function(ch, chId){
					console.log('Found characteristic: ' + ch.name + ' with id: ' + ch.uuid);
					if(ch.uuid === '2a37'){
						heartRateCh = ch;
						console.log("HeartRate Char val: " + ch);
						//process.exit();
						heartRateCh.subscribe(function(error){
							console.log("heart rate notification is on");
						});
					}
					if(ch.uuid === 'befdff11c97911e19b210800200c9a66'){
						activityCh = ch;
						console.log("Activity Char val: " + ch);
						activityCh.subscribe(function(error){
							console.log("activity notification is on");
						});
					}

				});
				
				//process.exit();
				//Check if we found the heartRateCh characteristic
				if(!heartRateCh){
					console.log('Failed to find Heart Rate Measurement characteristic');
					process.exit();
				}
				else{
					heartRateCh.on('data', function(data, isNotification){
						console.log('heart rate is: ' + data.readIntBE(2));
					});
				}
				
				if(!activityCh){
					console.log('Failed to find Activity Measurement characteristic');
					process.exit();
				}
				else{
					activityCh.on('data', function(data, isNotification){
						console.log('activity is: ' + data.readIntBE(2));
					});
				}

		});
	});
}});
		
