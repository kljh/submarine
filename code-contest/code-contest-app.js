'use strict';

const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite = require('../sqlite');
const db = path.join(__dirname, ".code-contest/db.sqlite");
const mandatory_uid = false;

module.exports = function(app) {
    console.log("Code Contest handler installed. "+db)

    app.use('/code-contest-register', code_contest_register);
    app.use('/code-contest-upload-source', code_contest_upload_source);
    app.use('/code-contest-get-input-data', code_contest_get_input_data);
    app.use('/code-contest-submit-output-data', code_contest_submit_output_data);

    var tmp_dir = path.join(__dirname, ".code-contest");
    fs.exists(tmp_dir, bExist => { if (!bExist) fs.mkdir(tmp_dir) }); 

	Promise.resolve()
	//.then(_ => sqlite.sqlite_exec(db, "DROP TABLE IF EXISTS participants"))
	//.then(_ => sqlite.sqlite_exec(db, "DROP TABLE IF EXISTS submissions"))
	.then(_ => sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS participants ( user_id, user_name PRIMARY KEY, timestamp )"))
	.then(_ => sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS submissions ( user_id, problem_id, attempt, timestamp, completed, result )"))
	.catch(err => { console.error("ERROR: "+(err.stack||err)); });
	
};

// register a team (name, password, etc.)
function code_contest_register(req, res) {
    var name = req.query.name || req.body.name;
    var timestamp = (new Date()).toISOString();
    var uid = crypto.createHash('md5').update(timestamp+name+Math.random()).digest("hex");

    Promise.resolve()
    .then(_ => sqlite.sqlite_exec(db, "INSERT INTO participants VALUES ( ?, ?, ? )",  [ uid, name, timestamp ]))
    .then(_ => res.send({ msg: "Hello "+name, uid: uid }))
    .catch(err => { res.status(500); res.send("ERROR: "+(err.stack||err)); });
}

// save source files to disk
function code_contest_upload_source(req, res) {
	var git;
	try { git = require('nodegit'); } catch (e) { console.warn("require('nodegit'): "+(e.stack||e)); }
	
	var git_repo_path = path.join(__dirname, ".code-contest")
	var full_path = path.join(git_repo_path, req.query.uid, req.query.pid, git?'':req.query.attempt.replace(/:/g,'_'), req.query.src);
	var folder = path.join(full_path, '..');
	mkdirsSync(folder);
    
	fs.writeFileSync(full_path, req.body);
	if (git) {
        git_commit(git_repo_path, [ path.posix.join(req.query.uid, req.query.pid, req.query.src.replace(/\\/g, "/")) ], 
            { user: req.query.uid, email: req.query.email || "code@main2.fr", msg: req.query.msg })
        .then(function (git_commit_info) {
            res.send(""+git_commit_info);
        })
        .catch(function (err) {
            console.error(err);
            res.status(500);
            res.send("ERROR: "+(err.stack||err));
        });
    } else {
        res.send("saved "+full_path);
    }
}

// get input data
function code_contest_get_input_data(req, res) {
    //console.log("code_contest_get_input_data", req.query, req.body);
    var problem_handler = require("./code-contest-app-"+req.query.pid+".js");
    
    Promise.resolve()
    .then(_ => sqlite.sqlite_exec(db, "SELECT * from participants WHERE user_id = ? ",  [ req.query.uid,  ]))
    .then(users => { if (mandatory_uid && users.length<2) throw new Error("unknown user id '"+req.query.uid+"' (are you using user name ?)"); })
    .then(_ => sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS submissions ( user_id, problem_id, attempt, timestamp, completed, result )"))
    .then(function (data) {
        return sqlite.sqlite_exec(db, "SELECT DISTINCT timestamp, completed, result FROM submissions WHERE user_id=? and problem_id=? and attempt=? ", 
			[ req.query.uid, req.query.pid, req.query.attempt ]);
    })
    .then(function (previous_steps) {
		return problem_handler.get_input_data(previous_steps);
    })
    .then(function (input_data) {
        if (input_data!==undefined) {
            res.send(input_data);
        } else {
            res.status(404);
            res.send();
        }
    })
    .catch(function (err) {
        console.error(err);
        res.status(500);
        res.send("ERROR: "+(err.stack||err));
    });
}

// submit output data
function code_contest_submit_output_data(req, res) {
    //console.log("code_contest_submit_output_data", req.query, req.body);
    var timestamp = (new Date()).toISOString();
    
    var problem_handler = require("./code-contest-app-"+req.query.pid+".js");
    
    Promise.resolve()
    .then(_ => sqlite.sqlite_exec(db, "SELECT * from participants WHERE user_id = ? ",  [ req.query.uid,  ]))
    .then(users => { if (mandatory_uid && users.length<2) throw new Error("unknown user id '"+req.query.uid+"' (are you using user name ?)"); })
    .then(_ => sqlite.sqlite_exec(db, "SELECT DISTINCT timestamp, completed, result FROM submissions WHERE user_id=? and problem_id=? and attempt=? ", 
		[ req.query.uid, req.query.pid, req.query.attempt ]))
    .then(function (previous_steps) {
         return problem_handler.submit_output_data(req.body, previous_steps);   
    })
    .then(function (status) {
        // completion : 1 for fully completed, 0.5 for correct intermediate output, 0 for incorrect output
        var completed = status.completed; 
        if (typeof completed == "boolean") completed = completed?1:0;

        // result : a measure of the quality of the output (accuracy, optimality, complexity)
        var result = status.result;

        // fields used by submission script: status.iterate, status.msg 

        return sqlite.sqlite_exec(db, "INSERT INTO submissions VALUES ( ?, ?, ?, ?, ?, ? )", 
            [ req.query.uid, req.query.pid, req.query.attempt, timestamp, completed, result ])
        .then(function (db_res) {
            res.send({ "completed": completed, "msg": status.msg, "iterate": status.iterate || false });
        });
    })
    .catch(function (err) {
        console.error(err);
        res.status(500);
        res.send("ERROR: "+(err.stack||err));
    });
}

function git_commit(git_repo_path, src_files, prms) {
    var git = require('nodegit');
	var repo, index, oid;

	var repo_promise;
	if (!fs.existsSync(path.join(git_repo_path, ".git"))) {
		console.log("create repo", git_repo_path);
        repo_promise = git.Repository.init(git_repo_path, 0);
        console.warn("**** make a first commit (.gitignore) so that HEAD is defined and code below works ****");
	} else {
		console.log("open repo", git_repo_path);
		repo_promise = git.Repository.open(git_repo_path);
	}

	var git_promise = repo_promise
	.then(repo_result => { 
		repo = repo_result; 
		return repo.refreshIndex(); // .index() or .refreshIndex())
	})
	.then(index_result => { 
		index = index_result; 
		return index; 
	})
	.then(index => {
		var add_promises = src_files.map(src_file => index.addByPath(src_file));
		return Promise.all(add_promises);
    })
	.then(err_codes => {
		var ok = err_codes.reduce((acc, val) => { return acc && !val; }, true);
		if (!ok) { 
			console.error("index.addByPath failed");
			throw new Error("index.addByPath failed");
		}
		return index.write(); 
	})
	.then(err_code => { 
		return index.writeTree(); 
	})
	.then(oid_result => { 
		oid = oid_result;
		return git.Reference.nameToId(repo, "HEAD");
	})
	.then(function(head) {
		return repo.getCommit(head);
	})
	.then(function(parent) {
		var update_ref = "HEAD";
		
		var author = git.Signature.now(prms.user||"anonymous", prms.email||"unknown@null.com");
		var committer = author;
		
		var message = prms.msg || "(no message)";
		return repo.createCommit(update_ref, author, committer, message, oid, [ parent ]);
    })
	.then(commit => {
		console.log("commit", commit);
		return commit;
	});

    return git_promise;
}

function mkdirsSync(folder) {
	if (!fs.existsSync(folder))  {
		console.log('mkdirsSync', folder);
		var parent_folder = path.join(folder, '..');
	    mkdirsSync(parent_folder);
		fs.mkdirSync(folder); 
    }
}

function _git_commit_test() {
	var git_repo_path = path.join(__dirname, ".code-contest-test")
	fs.writeFileSync(path.join(git_repo_path, "test.txt"), "a random number\n"+Math.random());
	git_commit(git_repo_path, [ "test.txt" ], { user: "test", email: "test@null.com"})
	.catch(err => console.error("git_commit: "+(e.stack||e)));
}
//git_commit_test();
