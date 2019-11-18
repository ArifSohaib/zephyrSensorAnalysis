# zephyrSensorAnalysis
Repository to connect to Zephyr HxM sensor and measure data.

## Requirements
nodejs
bluetooth-hci-socket (can install using npm install @abandonware/noble) on Node 10.


#start reading data.

First get the mac address of your sensor. 
In windows, conenct to the HxM using bluetooth and then go to DeviceManager->Bluetooth->Zephyr HxM *** -> Properties 

Put the address in the line `device.address = ''`

to test the reader:
sudo node noble_test.js

note: sudo is needed because of the way the bluetooth drivers are installed

