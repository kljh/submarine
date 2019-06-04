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

def read_args():

	default_server = "" # "http://kljh.herokuapp.com/", "http://localhost:8086/"

	parser = argparse.ArgumentParser(description='Code Contest.', epilog="Example: python "+sys.argv[0]+" --uid me --pid z --cmd z.exe --src z.c")
	parser.register('type','bool',str2bool) # use type='bool' (with quotes), do not use type=bool (without quotes)

	parser.add_argument('--srv', dest='srv', required=default_server=="", help='server URL', default=default_server )
	parser.add_argument('--uid', dest='uid', required=True, help='user ID' ) # , default="test")
	parser.add_argument('--pwd', dest='pwd', required=False, help='user password', default="test")
	parser.add_argument('--pid', dest='pid', required=True, help='problem ID' ) # , default="pi")
	parser.add_argument('--cmd', dest='cmd', required=True, help='command line to execute', nargs='+' ) # , default=["node", "solution.js"])
	parser.add_argument('--timeout', dest='timeout', help='timeout in seconds to execute command', default=10)
	parser.add_argument('--src', dest='src', required=True, help='path to source code (files or folders)', nargs='+' )
	parser.add_argument('--email', dest='email', help='email to use in Git', default=None )
	parser.add_argument('--stdin',  dest='stdin', help='if true (default), input is sent to stdin. otherwise, the input file path is appended to the command line', type='bool', default=True )
	parser.add_argument('--stdout', dest='stdout', help='if true (default), input is read from stdin. otherwise, the output file path is appended to the command line', type='bool', default=True )
	parser.add_argument('--msg', dest='msg', help='message in Git', default=None )
	parser.add_argument('--verbose', dest='verbose', help='Show the commands being executed, etc..', type='bool', default=False )

	args = parser.parse_args()

	# 0. send source
	# 1. get test input, save to disk
	# 2. run the command
	# 3. send test output
	# 4. display result. go back to 1. if more test input are available

	print("Server used:", args.srv)
	print("Reading input from", "console (stdin)" if args.stdin else "file")
	print("Writing output to", "console (stdout)" if args.stdout else "file")
	print()

	return args

def upload_sources(args, srcs):
	if srcs == None: return

	check_per_file = [  os.path.exists(src) for src in srcs ]
	check = reduce(lambda x, y: x and y, check_per_file)
	if check!=True:
		print("Path to source does not exist")
		sys.exit(1)

	# converting folders to files
	src_files = []
	for src in srcs:
		if os.path.isdir(src):
			folders = os.walk(src, topdown=True)
			for dirpath, dirnames, filenames in folders:
				while len(dirnames)>0 and dirnames[0][0]==".":
					#print("ignoring", dirnames[0])
					del dirnames[0]
				#print("folder", dirpath)
				for src_file in filenames:
					if src_file[0]!=".":
						src_files.append(os.path.join(dirpath[len(src)+1:], src_file))
		else:
			src_files.append(src)
	srcs = src_files

	print("Uploading src.. " + ("(%i files)" % len(srcs) if len(srcs) else "") )
	headers = { "Content-Type": "application/octet-stream" }
	for src in srcs:

		with open(src, "rb") as fi:
			src_bs = fi.read()
		print("  "+src)
		response = requests.post(args.srv+"code-contest/upload-source", data=src_bs, headers=headers,
			params={ "uid": args.uid, "pid": args.pid, "attempt": attempt, "src": src, "email" : args.email})
		print(args.srv+"code-contest/upload-source", src, response.status_code, response.text)
		if response.status_code>299: sys.exit(1)
	print("Source code upload complete.\n")

def main():
	args = read_args()

	upload_sources(args, args.src)

	iter = 0
	while True:
		iter = iter + 1

		input_data = get_input(args)
		if input_data == None:
			print("DONE")
			sys.exit(0)

		output_data = run_command(input_data, args, iter)

		#print("input:\n"+input_data+"\n")
		#print("output:\n"+output_data+"\n")

		result = submit_output(args, output_data)
		#print("result:\n", result, "\n")
		completed = result.get("completed", 0.5)
		iterate = result.get("iterate", False)
		msg = result.get("msg", "")

		if completed == False or completed == 0:
			print("TEST SET", iter, ": REJECTED", msg)
			sys.exit(1)
		elif completed == True or completed == 1:
			print("TEST SET", iter, ": COMPLETED", )
			sys.exit(0)
		else:
			if msg != "":
				print("TEST SET", iter, " ", msg)
			else:
				print_progress_point()
		print("")

		if iterate != True:
			print("DONE")
			sys.exit(0)

def str2bool(v):
	return v.lower() in ("yes", "true", "t", "1")

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

def run_command(input_data, args, iter):
	code_contest_data = os.path.join(os.path.dirname(os.path.realpath(__file__)), '.code-contest-submit')
	if not os.path.exists(code_contest_data):
		os.makedirs(code_contest_data)

	input_data_file  = os.path.join(code_contest_data, args.pid+"-"+str(iter)+"-input.txt")
	output_data_file = os.path.join(code_contest_data, args.pid+"-"+str(iter)+"-output.txt")

	# write input data to file
	with open(input_data_file, "wb") as f:
		f.write(input_data.encode('utf-8'))

	cmd = args.cmd
	if not args.stdin: cmd = cmd + [ input_data_file ]
	if not args.stdout: cmd = cmd + [ output_data_file ]

	cmd_line = " ".join([ '"'+x+'"' for x in cmd ])
	if args.verbose: print("command:", cmd_line)

	#p =subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	# bytes_out = p.communicate(input=bytes_in)[0]
	# bytes_out = subprocess.check_output(cmd)

	kill = lambda process: process.kill()
	p = subprocess.Popen(cmd,
		stdin = subprocess.PIPE if args.stdin else None,
		stdout = subprocess.PIPE if args.stdout else None,
		stderr = subprocess.PIPE if args.stdout else None) # , encoding='utf-8'  Python 3.6 only

	timer = Timer(args.timeout, kill, [p])
	try:
		timer.start()
		bytes_in = input_data.encode('utf-8') if args.stdin else None
		bytes_out = p.communicate(bytes_in)[0]
	finally:
		timer.cancel()

	if p.returncode!=0:
		print("Command:", cmd_line, (" < "+input_data_file) if args.stdin else "")
		print("return code:", p.returncode)
		print("")
		raise Exception("Exception with command.")

	if args.stdout:
		output_data = bytes_out.decode('utf-8').replace('\r', '')
	else:
		# read output data from file
		with open(output_data_file, "rb") as f:
			output_data = f.read(input_data).decode('utf-8')

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
		#print("\nwhile uploading results:")
		#print(output_data)
		print("while uploading %i bytes." % len(output_data))
		print("\n")
		raise e

def print_progress_point():
	import sys
	sys.stdout.write(".")
	sys.stdout.flush()

	# Python 3 only: print(".", end="")

main()
