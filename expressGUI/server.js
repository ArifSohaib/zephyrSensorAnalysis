const noble = require("noble");
const express = require("express");
const app = express();
app.set("view engine","ejs");





app.listen(3000, function(){
    console.log("HxM app listening on port 3000");
})
var heartRate = [];
var activityVal = [];
//check if the adapter is powered on then start scanning for devices
noble.on('stateChange', function(state){
	if(state=='poweredOn'){
		console.log('Powered on');
		noble.startScanning();
	}
});

app.get("/data", function(req, res){
	var data = JSON.stringify({"heartRate":heartRate,"activityVal":activityVal});
	//console.log(data);
	res.send(data);
});

app.get("/", function(req, res){
    res.render("index")
});

//Register a function to recieve any newly discovered devices
noble.on('discover', function(device){
	console.log('Found device: ' + device.address);
	//check if this is the Zephyr HxM
	if(device.address ==='5c:31:3e:50:47:be'){
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
				var testCh = null;
				var propWriteCh = null;
				
				characteristics.forEach(function(ch, chId){
					console.log('Found characteristic: ' + ch.name + ' with id: ' + ch.uuid + " and properties:" + ch.properties);
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
							if(!error){
								console.log("activity notification is on");
							}
							else{
								console.log("error: " + error);
							}
						});
					}
					if(ch.uuid === 'befdff16c97911e19b210800200c9a66'){
						propWriteCh = ch;
						console.log("Prop Write val: " + ch);
						propWriteCh.write(new Buffer(0x02),true, function(error){
							if(error){
								console.log("error: could not write " + error);
							}
							else{
								console.log("enabled test field");
							}
						});
					}					
					if(ch.uuid === 'befdff12c97911e19b210800200c9a66'){
						testCh = ch;
						console.log("Test Char val: " + ch);
						testCh.subscribe(function(error){
							console.log("test notification is on");
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
						//console.log('heart rate is: ' + data.readIntLE(1));
						if(heartRate.length % 15 == 0){
							heartRate.shift();
						}
						heartRate.push(data.readIntLE(1))
						console.log("heart rate is: " + heartRate);
					});
				}
				
				if(!activityCh){
					console.log('Failed to find Activity Measurement characteristic');
					process.exit();
				}
				else{
					activityCh.on('data', function(data, isNotification){
						var activity = data.readFloatLE(0,1);
						console.log('activity is: ' + activity);
						if(activityVal.length % 15 == 0){
							activityVal.shift();
						}
						activityVal.push(activity)
						console.log('peek is: ' + data.readFloatLE(1,1));
					});
				}
				
				if(!testCh){
					console.log('Failed to find Test Measurement characteristic');
					process.exit();
				}
				else{
					testCh.on('data', function(data, isNotification){
						console.log('test is: ' + data.readUIntBE(2));
					});
				}
				

		});
	});
}});
		
