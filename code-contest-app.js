'use strict';

const url = require('url');
const fs = require('fs');
const path = require('path');
const sqlite = require('./sqlite')
const db = ".code-contest/db.sqlite"

module.exports = function(app) {
    console.log("Code Contest handler installed.")

    app.use('/code-contest-register', code_contest_register);
    app.use('/code-contest-get-input-data', code_contest_get_input_data);
    app.use('/code-contest-submit-output-data', code_contest_submit_output_data);
};

// register a team (name, password, etc.)
function code_contest_register(req, res) {
    var name = req.query.name || req.body.name;
    
    res.send({ msg: "Hello "+name });
}

// get input data
function code_contest_get_input_data(req, res) {
    //console.log("code_contest_get_input_data", req.query, req.body);
    var problem_handler = require("./code-contest-app-"+req.query.pid+".js");
    
    sqlite.sqlite_exec(db, "CREATE TABLE IF NOT EXISTS submissions ( user_id, problem_id, test_id, timestamp, validated )")
    .then(function (data) {
        return sqlite.sqlite_exec(db, "SELECT DISTINCT test_id FROM submissions WHERE user_id=? and problem_id=? and validated=1 ", 
			[ req.query.uid, req.query.pid ]);
    })
    .then(function (data) {
        return data.map(row => row[0]).slice(1);
    })
    .then(function (validated_tests) {
        var input_data = problem_handler.get_input_data(validated_tests);
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
    var status = problem_handler.submit_output_data(req.body);
    var validated = status.validated;
    var test_id = status.test_id || (new Date()).toISOString();
    
    sqlite.sqlite_exec(db, "INSERT INTO submissions VALUES ( ?, ?, ?, ?, ? )", 
        [ req.query.uid, req.query.pid, test_id, timestamp, validated?1:0 ])
    .then(function (data) {
        res.send({ "validated": validated, "msg": status.msg, "next": status.next || false });
    })
    .catch(function (err) {
        console.error(err);
        res.status(500);
        res.send("ERROR: "+err);
    });
}
