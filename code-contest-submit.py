from __future__ import print_function

import sys, os
import argparse
import subprocess
import requests


def main():
	required = True
	
	parser = argparse.ArgumentParser(description='Code Contest.')
	parser.add_argument('--srv', dest='srv', help='server URL', default="http://kljh.herokuapp.com/static/" ) # , "http://localhost:8085/")
	parser.add_argument('--uid', dest='uid', required=required, help='user ID' ) # , default="test")
	parser.add_argument('--pid', dest='pid', required=required, help='problem ID' ) # , default="pi")
	parser.add_argument('--cmd', dest='cmd', required=required, help='path to command to execute', nargs='+' ) # , default=["node", "solution.js"])
	parser.add_argument('--src', dest='src', required=required, help='path to source code', nargs='+' )

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

	code_contest_data = os.path.join(os.path.dirname(os.path.realpath(__file__)), '.code-contest')
	if not os.path.exists(code_contest_data):
		os.makedirs(code_contest_data)
	
	if args.src == None or not os.path.exists(args.src):
		print("Path to source does not exist")
		sys.exit(1)
	# To do : upload source / commit it to git
	
	next = ""
	while True:
		
		input_data = get_input(args)
		if input_data == None:
			print("DONE")
			sys.exit(0)

		input_data_file = os.path.join(code_contest_data, args.pid+".txt")
		fo = open(input_data_file, "wb") 
		fo.write(input_data.encode('utf-8'))
		fo.close()
		
		output_data = run_command(args, input_data_file)
		
		#print("input:\n"+input_data+"\n")
		#print("output:\n"+output_data+"\n")
		
		result = submit_output(args, output_data)
		#print("result:\n", result, "\n")

		if result["validated"] == False: 
			print("STATUS", next, ": NOT VALIDATED\n", result.msg)
			sys.exit(1)
		elif result["validated"] == True: 
			print("STATUS", next, ": VALIDATED")
			if result["next"] == None or result["next"] == False:
				print("DONE")
				sys.exit(0)
			else:
				next = result["next"]
		else :
			print("STATUS", next, ": UNKNOWN\n", result)
			sys.exit(1)	

def get_input(args):
	r = requests.get(args.srv+"code-contest-get-input-data", params={ "uid": args.uid, "pid": args.pid })
	#print(r.status_code, r.headers['content-type'], r.encoding)
	#print(r.text)
	#print(r.json())
	if r.status_code==404:
		print("STATUS: ALREADY VALIDATED. NO MORE INPUT.")
		return None
	else:
		return r.text

def run_command(args, input_data_file):
	cmd = args.cmd + [ input_data_file ]
	#print("command to execute:", cmd)
	
	#p =subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) # , encoding='utf-8'  Python 3.6 only
	# bytes_in = input_data.encode('utf-8')
	# bytes_out = p.communicate(input=bytes_in)[0]
	
	bytes_out = subprocess.check_output(cmd)
	
	output_data = bytes_out.decode('utf-8').replace('\r', '')	
	return output_data

def submit_output(args, output_data):
	r = requests.post(args.srv+"code-contest-submit-output-data", params={ "uid": args.uid, "pid": args.pid }, 
		data = output_data, # data=json.dumps(payload)  or  json=payload
		headers= { 'content-type': 'text/plain; charset=UTF-8' } # 'text/plain' or  'application/octet-stream' for plain data
		)
	#print(r.status_code, r.headers['content-type'], r.encoding)
	#print(r.text)
	#print(r.json())
	return r.json()

main()