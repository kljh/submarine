'use strict';

const sqlite3 = require('sqlite3'); // .verbose();
// Install with : const sqlite_app = require('./sqlite.js').sqlite_install(app); 
// To do?? : add a busy handler


function sqlite_install(app) {

    // http://localhost:8085/sqlite_exec?stmt=select * from sqlite_master
    // http://localhost:8085/sqlite_exec?stmt=select * from test_table&to_html=true
    // http://localhost:8085/sqlite_insert?table=test_table&rows=[{"k1":123}]

    app.use('/sqlite_exec', function (req, res) {
        var prms = req.method=="GET" ? req.query : req.body;
        sqlite_exec(prms.db, prms.stmt, prms.args, prms)
        .then(function(data) { res.send(data); })
        .catch(function(err) { 
            res.status(500); res.send({ msg: err.message, error: err }); 
        })
    });

    app.use('/sqlite_insert', function (req, res) {
        var prms = req.method=="GET" ? req.query : req.body;
        var rows = prms.rows.substr ? JSON.parse(prms.rows) : prms.rows;
        sqlite_insert_or_update("insert", prms.db, prms.table, rows, prms)
        .then(function(data) { res.send(data); })
        .catch(function(err) { res.status(500); res.send({ error: err }); })
    });

    app.use('/sqlite_update', function (req, res) {
        var prms = req.method=="GET" ? req.query : req.body;
        var rows = prms.rows.substr ? JSON.parse(prms.rows) : prms.rows;
        sqlite_insert_or_update("update", prms.db, prms.table, rows, prms)
        .then(function(data) { res.send(data); })
        .catch(function(err) { res.status(500); res.send({ error: err }); })
    });

    app.use('/sqlite_table', function (req, res) {
        var prms = req.query.db ? req.query : req.body; // the prms are where the db name is !
        var rows = prms.rows || req.body; // except maybe for the table rows
        if (rows.substr) try { rows = JSON.parse(rows); } catch (e) {}
        if (rows.substr) try { rows = from_tsv(rows); } catch (e) {}

        var headers = rows[0];
        var sql_drop = "drop table if exists "+prms.table;
        //var sql_stmt = "create table ? ("+headers.map(_=>"?").join(",")+")";
        //var sql_args = [prms.table].concat(headers); 
        var sql_stmt = "create table "+prms.table+" ("+headers.join(",")+")";
        var sql_args = []; 
        
        sqlite_exec(prms.db, sql_drop, [], prms)
        .then(_ => sqlite_exec(prms.db, sql_stmt, prms.args, prms))
        .then(_ => sqlite_insert_or_update("insert", prms.db, prms.table, rows, prms))
        .then(function(data) { res.send(data); })
        .catch(function(err) { res.status(500); res.send({ msg: err.message, error: err }); })
    });
}



function sqlite_exec(db_path, stmt_txt, opt_stmt_args, opt_prms) {
    var stmt_args = opt_stmt_args || [];
    var prms = opt_prms || {};

    return new Promise(function(resolve, reject) {
        function err_handler(err) { 
            if (err) 
                reject(err); 
        }

        var mode = prms.read_only ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
        var db = db_path ? new sqlite3.Database(db_path, mode, err_handler) : memory_db;
        
        db.serialize(function() {
            /*
            // EXEC: no rows returned 
            db.serialize(function() {
            db.exec(stmt_txt, err_handler);
            
            // EXEC: no rows returned but 'this' is the exectuted statment  
            // and 'this.lastID' is the last inserted row id for INSERT statement
            // and 'this.changes' is the number of rows affected for UPDATE and DELETE statements
            db.exec(stmt_txt, err_handler);
            
            // EACH: one callback invokation per row
            var res = []; 
            db.each(stmt_txt, stmt_args,
                 function(err, row) { if (err) reject(err); else res.push(row); }
                 function(err, nb_row) { if (err)  reject(err); else resolve(res); } );
            */

            // ALL: one callback invokation with all rows (memory footprint)
            db.all(stmt_txt, stmt_args, 
                function(err, rows) { 
                    if (err) {
                        reject(err); 
                    } else {
                        if (prms.to_array2d) resolve(to_array2d(rows));
                        else if (prms.to_tsv) resolve(to_tsv(to_array2d(rows)));
                        else if (prms.to_html) resolve(to_html(to_array2d(rows)));
                        else resolve(rows); 
                    }
                });

            //db.all("COMMIT", err_handler);

        });
        if (db_path)
            db.close(err_handler);
    });
}


function sqlite_insert_or_update(insert_or_update, db_path, table_name, table_rows, opt_prms) {
    var prms = opt_prms || {};

    return new Promise(function(resolve, reject) {
        function err_handler(err) { 
            if (err) 
                reject(err); 
        }

        var mode = prms.read_only ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
        var db = db_path ? new sqlite3.Database(db_path, mode, err_handler) : memory_db;

        // !! To do?? : add a BEGIN TRANSACTION and COMMIT ? in a db.serialize

        var res = [];
        db.serialize(function() {
            var rows = to_array2d(table_rows);
            var hdrs = rows[0];

            var stmt_txt, stmt_arg_positions;
            if (insert_or_update=="insert") {
                var placeholders = new Array(hdrs.length).fill('?').join(', ');
                stmt_txt = 'insert '+(prms.onconflict||'')+' into '+table_name+' ('+hdrs.join(', ')+') values ('+placeholders+')';
            } else {
                var where_keys = prms.where_keys;
                var where_key_positions = where_keys.map(x => hdrs.indexOf(x));
                var where_key_placeholders = where_keys.map(x => "["+x+"] = ?");
                var set_value_positions = [];    for (var x of hdrs) { if (where_keys.indexOf(x)==-1) set_value_positions.push(hdrs.indexOf(x)); };
                var set_value_placeholders = []; for (var x of hdrs) { if (where_keys.indexOf(x)==-1) set_value_placeholders.push("["+x+"] = ?"); };
                
                stmt_txt = 'update '+(prms.onconflict||'')+' '+table_name+' set '+set_value_placeholders.join(", ")+' where '+where_key_placeholders.join(" and ");
                stmt_arg_positions = [].concat(set_value_positions, where_key_positions);
            }
            
            console.log("stmt", stmt_txt);
            var stmt = db.prepare(stmt_txt);
            
            // !! can we parallelize ??
            // db.parallelize(function() {
                for (var i=1; i<rows.length; i++) {
                    var row = rows[i];
                    var stmt_args; 
                    if (insert_or_update=="insert") {
                        stmt_args = rows[i];
                    } else {
                        stmt_args = stmt_arg_positions.map(j => row[j]);
                    }

                    stmt.run(stmt_args, function (err) {
                        if (err) 
                            return reject(err);
                        if (insert_or_update=="insert") {
                            res.push(this.lastID);
                        } else {
                            res.push(this.changes);
                            if (!this.changes) {
                                console.warn("no rows update, do an insert instead"); // ?? 
                            }
                        }
                        if (res.length+1==rows.length) 
                            resolve_res(); // callback for db.close not called for :memory: databases
                    }); 
                }
            // });

            stmt.finalize(err_handler);
        })

        if (db_path) 
        db.close(function (err) {
            if (err) 
                reject(err);
        });

        function resolve_res() {
            if (insert_or_update=="insert") {
                resolve({ last_insert_row_id : res });
            } else {
                resolve({ nb_changed_rows : res });
            }
        }
    });
}


function to_array2d(v) {
    if (Array.isArray(v[0]))
        return v;
    else 
        return objectarray_to_array2d(v);       
}

function objectarray_to_array2d(v) {
    if (!v) return null;
    if (v.length==0) return [[]];
    var hdr = Object.keys(v[0])
    var res = [ hdr ];
    for (var o of v) 
        res.push( hdr.map(k => o[k]) );
    return res;
}

function array2d_to_objectarray(v) {
    var hdrs = v[0];
    var res = [];
    for (var i=1; i<v.length; i++) {
        var row = {};
        for (var j=0; j<hdrs.length; j++)
            row[hdrs[j]] = v[i][j]
    }
    return res;
}

function from_tsv(txt) {
    return txt.replace(/\r/g, '').split("\n").map(row => row.split("\t"));
}

function to_tsv(arr) {
    return arr.map(row => row.join("\t")).join("\n");
}

function to_html(arr) {
    return "<html><table>" +
        arr.map(row => 
            "<tr>" + row.map(
                x => "  <td>"+x+"</td>"
            ).join("\n") + "</tr>"
        ).join("\n") 
        + "</table></html>"
}

function sqlite3_test() {
    sqlite_exec("", "DROP TABLE IF EXISTS test_table")
    .then(function () {
        return sqlite_exec("", "CREATE TABLE test_table ( v1, k1, v2, k2, v3, PRIMARY KEY (k1, k2))");
    })
    .then(function () {
        return sqlite_exec("", "SELECT * FROM sqlite_master");
    })
    .then(function (schemas) {
        console.log("schemas: "+ JSON.stringify(schemas, null, 4));
        return sqlite_insert_or_update("insert", "", "test_table", [ 
                { v1: "v", k1: "k", k2: "kk", v3: "vvv" },
                { v1: "w", k1: "c", k2: "cc", v3: "www" },
                { v1: "w", k1: "c", k2: "dd", v3: "xyz" },
                { v1: "W", k1: "c", k2: "cc", v3: "xyz" },
            ], 
            {
                onconflict: "OR IGNORE"
            });
    })
    .then(function (ins) {
        console.log("ins: "+ JSON.stringify(ins, null, 4));
        return sqlite_exec("", "select * from test_table");
    })
    .then(function (sel) {
        console.log("sel: "+ JSON.stringify(sel, null, 4));
        return sqlite_insert_or_update("update", "", "test_table", [ 
                { k1: "c", k2: "Claude Cochet", v3: "vvv" },
                { k1: "c", k2: "XYZ ABCD", v3: "xyz" },
            ], 
            {
                where_keys: [ "v3", "k1" ]
            });
    })
    .then(function (ups) {
        console.log("ups: "+ JSON.stringify(ups, null, 4))
        return sqlite_exec("", "select * from test_table", undefined, { to_array2d: true });
    })
    .then(function (sel) {
        console.log("sel: "+ JSON.stringify(sel, null, 4));
    })
    .catch(function (err) {
        console.error("sqlite3_test error", err);
    })
    .then(function (sel) {
        console.log("sqlite3_test DONE");
    })
    ;
}

var memory_db = new sqlite3.Database(":memory:", function (err) { 
    if (err) 
        throw new Error("couldn't create SQLite :memory: DB"); 

    //sqlite3_test();
});

module.exports = {
    sqlite_install: sqlite_install, 
    sqlite_exec: sqlite_exec
};
