'use strict';

const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite = require('./sqlite')
const db = ".code-contest/db.sqlite"

module.exports = function(app) {
    console.log("Code Contest handler installed.")

    app.use('/code-contest-register', code_contest_register);
    app.use('/code-contest-get-input-data', code_contest_get_input_data);
    app.use('/code-contest-submit-output-data', code_contest_submit_output_data);

    var tmp_dir = ".code-contest"
    fs.exists(tmp_dir, bExist => { if (!bExist) fs.mkdir(tmp_dir) }); 

	Promise.resolve()
	.then(_ => sqlite.sqlite_exec(db, "DROP TABLE IF EXISTS participants"))
	.then(_ => sqlite.sqlite_exec(db, "DROP TABLE IF EXISTS submissions"))
	.then(_ => sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS participants ( user_id, user_name, timestamp )"))
	.then(_ => sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS submissions ( user_id, problem_id, attempt, timestamp, completed, result )"))
	.catch(err => { console.error("ERROR: "+err); });
	
};

// register a team (name, password, etc.)
function code_contest_register(req, res) {
    var name = req.query.name || req.body.name;
    var timestamp = (new Date()).toISOString();
    var uid = crypto.createHash('md5').update(timestamp+name+Math.random()).digest("hex");

    Promise.resolve()
    .then(_ => sqlite.sqlite_exec(db, "INSERT INTO submissions VALUES ( ?, ?, ? )",  [ uid, name, timestamp ]))
    .then(_ => res.send({ msg: "Hello "+name, uid: uid }))
    .catch(err => { res.status(500); res.send("ERROR: "+err); });
}

// get input data
function code_contest_get_input_data(req, res) {
    //console.log("code_contest_get_input_data", req.query, req.body);
    var problem_handler = require("./code-contest-app-"+req.query.pid+".js");
    
    sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS submissions ( user_id, problem_id, attempt, timestamp, completed, result )")
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
        res.send("ERROR: "+err);
    });
}

// submit output data
function code_contest_submit_output_data(req, res) {
    //console.log("code_contest_submit_output_data", req.query, req.body);
    var timestamp = (new Date()).toISOString();
    
    var problem_handler = require("./code-contest-app-"+req.query.pid+".js");
    
    sqlite.sqlite_exec(db, "SELECT DISTINCT timestamp, completed, result FROM submissions WHERE user_id=? and problem_id=? and attempt=? ", 
		[ req.query.uid, req.query.pid, req.query.attempt ])
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
        res.send("ERROR: "+err);
    });
}
