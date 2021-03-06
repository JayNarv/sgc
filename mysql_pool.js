"use strict";
var mysql = require('mysql');

module.exports = function(connection_or_pool){

	console.log("constructor");
	var safe_connection = connection_or_pool;
	safe_connection.original_query = safe_connection.query;
	safe_connection.original_release = safe_connection.release;
	safe_connection.original_escape = safe_connection.escape;

	safe_connection.query = function () {
		var last_arg = arguments[arguments.length - 1];
		var bHasCallback = (typeof last_arg === 'function');
		if (!bHasCallback){
			last_arg = function(){};
		}
		var count_arguments_without_callback = bHasCallback ? (arguments.length-1) : arguments.length;
		var new_args = [];
		var q;
		
		for (var i=0; i<count_arguments_without_callback; i++)
			new_args.push(arguments[i]);

		new_args.push(function(err, results, fields){
			if (err){
				console.error("\nfailed query: "+q.sql);
				throw err;
			}
			last_arg(results, fields);
		});
		q = connection_or_pool.original_query.apply(connection_or_pool, new_args);
		return q;
	};

	safe_connection.escape = function(str){
		return connection_or_pool.original_escape(str);
	};
	
	safe_connection.release = function(){
		connection_or_pool.original_release();
	};

	safe_connection.addQuery = function (arr) {
		var query_args = [];
		for (var i=1; i<arguments.length; i++)
			query_args.push(arguments[i]);
		arr.push(function(callback){
			if (typeof query_args[query_args.length-1] !== 'function')
				query_args.push(function(){callback();});
			else{
				var f = query_args[query_args.length-1];
				query_args[query_args.length-1] = function(){
					f.apply(f, arguments);
					callback();
				}
			}
			safe_connection.query.apply(safe_connection, query_args);
		});
	};

	safe_connection.takeConnectionFromPool = function(handleConnection){
		connection_or_pool.getConnection(function(err, new_connection) {
			if (err)
				throw err;
			console.log("got connection from pool");
			handleConnection(new_connection.original_query ? new_connection : module.exports(new_connection));
		});
	};
	
	safe_connection.getCountUsedConnections = function(){
		return (safe_connection._allConnections.length - safe_connection._freeConnections.length);
	};
	
	safe_connection.close = function(cb){
		connection_or_pool.end(cb);
	};
	
	safe_connection.addTime = function(interval){
		return "NOW() + INTERVAL "+interval;
	};

	safe_connection.getNow = function(){
		return "NOW()";
	};

	safe_connection.getFromUnixTime = function(ts){
		return "FROM_UNIXTIME("+ts+")";
	};

	safe_connection.getRandom = function(){
		return "RAND()";
	};

	safe_connection.forceIndex = function(index){
		return "FORCE INDEX ("+ index +")";
	};

	safe_connection.dropTemporaryTable = function(table){
		return "DROP TEMPORARY TABLE IF EXISTS " + table;
	};

	safe_connection.getIgnore = function(){
		return "IGNORE";
	};

	safe_connection.getUnixTimestamp = function(date){
		return "UNIX_TIMESTAMP("+date+")";
	};

	return safe_connection;
};