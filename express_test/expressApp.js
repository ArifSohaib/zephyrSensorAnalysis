const noble = require("noble");
const express = require("express");
const http = require('http');
const AWS = require("aws-sdk");
const app = express();
/**
var config = new AWS.Config(
	{
		region:'us-east-1',
		accessKeyId : process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
);
**/
/**
AWS.config.update(
	{
		region:'us-east-1',
		accessKeyId : process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
);
**/
AWS.config.loadFromPath('./config.json');
var ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});

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
				var testCh = null;
				var propWriteCh = null;
				var heartRate = [];
				var activity = [];
				var peekActivity = [];
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
							console.log("activity notification is on");
						});
					}
					if(ch.uuid === 'befdff16c97911e19b210800200c9a66'){
						propWriteCh = ch;
						console.log("Prop Write val: " + ch);
						propWriteCh.write(new Buffer(0x01),true, function(error){
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
						var hrate = data.readIntBE(2);
						var currentdate = new Date(); 
						var datetime =  currentdate.getDate() + "/"
										+ (currentdate.getMonth()+1)  + "/" 
										+ currentdate.getFullYear() + " @ "  
										+ currentdate.getHours() + ":"  
										+ currentdate.getMinutes() + ":" 
										+ currentdate.getSeconds();
						var response = JSON.stringify({"HeartRate":hrate, "time":datetime})
						
						var params = {
							TableName:'ZephyrSensor',
							Item: {
								'DateTime':{S: datetime},
								'HeartRate': {N: hrate.toString()},
							}
						};
						ddb.putItem(params, function(err, data){
							if(err){
								console.log("Error", err);
							}else{
								console.log("Success", data);
							}
						});								
						console.log('heart rate is: ' + hrate);
						heartRate.push(hrate);
					});
				}
				
				if(!activityCh){
					console.log('Failed to find Activity Measurement characteristic');
					process.exit();
				}
				else{
					activityCh.on('data', function(data, isNotification){
						var act = data.readIntBE(1,1)
						var peekAct = data.readIntBE(3,1);
						activity.push(act);
						peekActivity.push(peekAct);
						//console.log('activity is: ' + data.readIntBE(1,1));
						//console.log('peek is: ' + data.readIntBE(3,1));
						var currentdate = new Date(); 
						var datetime =  currentdate.getDate() + "/"
										+ (currentdate.getMonth()+1)  + "/" 
										+ currentdate.getFullYear() + " @ "  
										+ currentdate.getHours() + ":"  
										+ currentdate.getMinutes() + ":" 
										+ currentdate.getSeconds();
						var response = JSON.stringify({"activity":act, "peek":peekAct, "time":datetime})
						
						var params = {
							TableName:'ZephyrSensor',
							Item: {
								'DateTime':{S: datetime},
								'Activity': {N: act.toString()},
							}
						};
						ddb.putItem(params, function(err, data){
							if(err){
								console.log("Error", err);
							}else{
								console.log("Success", data);
							}
						});						
						console.log("activity is: " + act);
						console.log("peek activity is: " + peekAct);
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
				
					
				app.get("/api/activity", function(req, res){
					var currentdate = new Date(); 
					var datetime =  currentdate.getDate() + "/"
									+ (currentdate.getMonth()+1)  + "/" 
									+ currentdate.getFullYear() + " @ "  
									+ currentdate.getHours() + ":"  
									+ currentdate.getMinutes() + ":" 
									+ currentdate.getSeconds();
					var response = JSON.stringify({"activity":activity[activity.length-1], "peek":peekActivity[peekActivity.length-1], "time":datetime})
					/**
					var params = {
						TableName:"ZephyrSensor",
						Item: {
							"DateTime":{S: currentdate},
							"Activity": {S: activity[activity.length-1]},
						}
					};
					ddb.putItem(params, function(err, data){
						if(err){
							console.log("Error", err);
						}else{
							console.log("Success", data);
						}
					});
					**/
					res.send(response);
				});
				
				app.get("/api/heartRate", function(req, res){
					var currentdate = new Date(); 
					var datetime =  currentdate.getDate() + "/"
									+ (currentdate.getMonth()+1)  + "/" 
									+ currentdate.getFullYear() + " @ "  
									+ currentdate.getHours() + ":"  
									+ currentdate.getMinutes() + ":" 
									+ currentdate.getSeconds();
					var response = JSON.stringify({"heart_rate":heartRate[heartRate.length-1], "time":datetime})
					/**
					var params = {
						TableName:"ZephyrSensor",
						Item: {
							"DateTime":{S: currentdate},
							"Activity": {S: heartRate[heartRate.length-1]},
						}
					};
					ddb.putItem(params, function(err, data){
						if(err){
							console.log("Error", err);
						}else{
							console.log("Success", data);
						}
					});					
					**/
					res.send(response);
				});
				
			});
			
			

		});
		app.use(function(req, res, next) {
		  res.header("Access-Control-Allow-Origin", "*");
		  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		  next();
		});
		app.listen(3000);
	}
	
});

		

