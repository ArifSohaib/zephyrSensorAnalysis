import cv2
import apriltag
from picamera.array import PiRGBArray
from picamera import PiCamera
import time
from sense_hat import SenseHat
import numpy as np
from flask import Flask, render_template, Response 
import requests

app = Flask(__name__)
sense_hat_exists = False
try:
    r,g,b = 0,0,0
    sense = SenseHat()
    sense_hat_exists = True
except:
    sense_hat_exists = False
    
@app.route("/")
def index():
	return render_template("index.html")


def gen(camera):
	#WIDTH, HEIGHT = 2048,1080
	WIDTH, HEIGHT = 640,480
	camera.resolution = (WIDTH, HEIGHT)
	camera.framerate = 32
	rawCapture = PiRGBArray(camera, size=(WIDTH,HEIGHT))


	time.sleep(0.1)

	#cap = cv2.VideoCapture(0)
	#cap.set(cv2.CAP_PROP_FRAME_WIDTH,150)
	#cap.set(cv2.CAP_PROP_FRAME_HEIGHT,100)
	detector = apriltag.Detector()

	#while True:
	for frame in camera.capture_continuous(rawCapture, format="bgr", use_video_port=True):
		#ret, frame = cap.read()
		image = frame.array
		rawCapture.truncate(0)
		gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
		#cv2.imshow('frame',gray)
		det = detector.detect(gray)
		
		print(det)
		
		for i in range(len(det)):
			print(type(det[0]))
			print(det[0].corners)
			cv2.rectangle(image,(int(det[i].corners[0][0]),int(det[i].corners[0][1])),(int(det[i].corners[2][0]),int(det[i].corners[2][1])),(255,0,255),3)
		if sense_hat_exists == True:
				#print("sensehat exits, changing color")
				r = len(det) * 100
				if r > 255:
					r = 255
				b = 0
				g = len(det) * 50
				if g > 255:
					g = 255
					b = len(det) * 20
				if b > 255:
					b = 255
				sense.clear((r,g,b))    
		#cv2.imshow('img',image)
		
		r= requests.get("http://127.0.0.1:3000/api/all_data")
		print(r.json)
		"""TODO: add s3 url and image + filename"""
		#requests.put(url, image)
		yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + cv2.imencode('.jpg', image)[1].tostring()+ b'\r\n')
		#sense.clear()
		if cv2.waitKey(1) & 0xFF == ord('q'):
			#cap.release()
			cv2.destroyAllWindows()
			break

@app.route("/video_feed")
def video_feed():
	return Response(gen(PiCamera()), mimetype="multipart/x-mixed-replace; boundary=frame")
	
if __name__ == "__main__":
	app.run(host="0.0.0.0", debug=True)
