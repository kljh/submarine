from __future__ import print_function
from functools import reduce # required for Python 3, in global namespace in Python 2.6+

import sys, os
import datetime
import argparse
import subprocess
import requests

from threading import Timer

now = datetime.datetime.utcnow() #datetime.timezone.utc)
attempt = "ATTEMPT-"+now.isoformat()

def main():

	required = True

	parser = argparse.ArgumentParser(description='Code Contest.')
	parser.add_argument('--srv', dest='srv', help='server URL', default="" ) # "http://kljh.herokuapp.com/", "http://localhost:8086/"
	parser.add_argument('--uid', dest='uid', required=required, help='user ID' ) # , default="test")
	parser.add_argument('--pwd', dest='pwd', required=False, help='user password', default="test")
	parser.add_argument('--pid', dest='pid', required=required, help='problem ID' ) # , default="pi")
	parser.add_argument('--cmd', dest='cmd', required=required, help='path to command to execute', nargs='+' ) # , default=["node", "solution.js"])
	parser.add_argument('--timeout', dest='timeout', help='timeout in seconds to execute command', default=10)
	parser.add_argument('--src', dest='src', required=required, help='path to source code', nargs='+' )
	parser.add_argument('--email', dest='email', help='email in Git', default=None )
	parser.add_argument('--msg', dest='msg', help='message in Git', default=None )

	args = parser.parse_args()
	#print("command line args: ", args)

	#if args.uid == None :
	#	parser.print_help()
	#	sys.exit(1)

	# 0. send source
	# 1. get test input, save to disk
	# 2. run the command
	# 3. send test output
	# 4. display result. go back to 1. if more test input are available

	code_contest_data = os.path.join(os.path.dirname(os.path.realpath(__file__)), '.code-contest-submit')
	if not os.path.exists(code_contest_data):
		os.makedirs(code_contest_data)

	if args.src == None or len(args.src)==0:
		print("src not provided")
		sys.exit(1)
	elif args.srv == None or len(args.srv)==0:
		print("srv not provided")
		sys.exit(1)
	else:
		print("Server used:", args.srv)
		check_per_file = [  os.path.exists(src) for src in args.src ]
		check = reduce(lambda x, y: x and y, check_per_file)
		if check!=True:
			print("Path to source does not exist")
			sys.exit(1)

		print("Uploading src..")
		headers = { "Content-Type": "application/octet-stream" }
		for src in args.src:
			with open(src, "rb") as fi:
				src_bs = fi.read()
				fi.close()
			response = requests.post(args.srv+"code-contest/upload-source", data=src_bs, headers=headers,
				params={ "uid": args.uid, "pid": args.pid, "attempt": attempt, "src": src, "email" : args.email})
			print(args.srv+"code-contest/upload-source", src, response.status_code, response.text)
			if response.status_code>299: sys.exit(1)
		print("Upload complete.\n")

	iter = 0
	while True:
		iter = iter + 1

		input_data = get_input(args)
		if input_data == None:
			print("DONE")
			sys.exit(0)

		input_data_file = os.path.join(code_contest_data, args.pid+"-"+str(iter)+".txt")
		fo = open(input_data_file, "wb")
		fo.write(input_data.encode('utf-8'))
		fo.close()

		output_data = run_command(args, input_data_file)

		#print("input:\n"+input_data+"\n")
		#print("output:\n"+output_data+"\n")

		result = submit_output(args, output_data)
		#print("result:\n", result, "\n")
		completed = result.get("completed", 0.5)
		iterate = result.get("iterate", False)
		msg = result.get("msg", "")

		if completed == False or completed == 0:
			print("run_command: " + " ".join(args.cmd) + " " + input_data_file)
			print("STATUS", iter, ": REJECTED", msg)
			sys.exit(1)
		elif completed == True  or completed == 1:
			print("STATUS", iter, ": COMPLETED", )
			sys.exit(0)
		else:
			if msg != "":
				print("STATUS", iter, ": RECORDED", msg)
			else:
				print_progress_point()
		print("")

		if iterate != True:
			print("DONE")
			sys.exit(0)

def get_input(args):
	r = requests.get(args.srv+"code-contest/get-input-data", params={ "uid": args.uid, "pid": args.pid, "attempt": attempt })
	#print(r.status_code, r.headers['content-type'], r.encoding)
	#print(r.text)
	#print(r.json())
	if r.status_code==404:
		print("STATUS: COMPLETE. NO MORE INPUT.")
		return None
	elif r.status_code==500:
		print("ERROR GETTING INPUT.\n"+"DID YOU INPUT CORRECT PROBLEM ID?\n\n"+r.text+"\n")
		sys.exit(1)
	else:
		return r.text

def run_command(args, input_data_file):
	cmd = args.cmd + [ input_data_file ]
	#print("command to execute:", " ".join([ '"'+x+'"' for x in cmd ]))

	#p =subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) # , encoding='utf-8'  Python 3.6 only
	# bytes_in = input_data.encode('utf-8')
	# bytes_out = p.communicate(input=bytes_in)[0]
	# bytes_out = subprocess.check_output(cmd)

	kill = lambda process: process.kill()
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE, stderr=subprocess.PIPE)

	timer = Timer(args.timeout, kill, [p])

	try:
		timer.start()
		bytes_out = p.communicate()[0]
	finally:
		timer.cancel()


	output_data = bytes_out.decode('utf-8').replace('\r', '')
	return output_data

def submit_output(args, output_data):
	r = requests.post(args.srv+"code-contest/submit-output-data", params={ "uid": args.uid, "pid": args.pid, "attempt": attempt },
		data = output_data, # data=json.dumps(payload)  or  json=payload
		headers= { 'content-type': 'text/plain; charset=UTF-8' } # 'text/plain' or  'application/octet-stream' for plain data
		)
	try:
		return r.json()
	except Exception as e:
		print("Evaluation Error on server:")
		print(r.status_code, r.headers['content-type'], r.encoding)
		print(r.text)
		print("\nwhile uploading program's results:")
		print(output_data)
		raise e

def print_progress_point():
	import sys
	sys.stdout.write(".")
	sys.stdout.flush()

	# Python 3 only: print(".", end="")

main()
