#!/usr/bin/env node

//Import dependencies
var http = require('http');
var Table = require('cli-table');
var fs = require('fs-extra');
var request = require('request');
var Spinner = require('cli-spinner').Spinner;

//Import preferences
var prefs = require('./config.json');
var pjson = require('./package.json');

 
var spinner = new Spinner('fetching schedule.. %s');
spinner.setSpinnerString('|/-\\');

var parm1 = process.argv[2];
var parm2 = process.argv[3];

if (parm1 == "--clear-cache") {
    clearCache();
    return;
}

if(parm1 == undefined){
	printUsage();
	return;
}

//Get student id from parm
var studentId = parm1

if (process.argv[3] == "--force")
    var forceReCache = true;

//Check input and fetch schedule
if (studentId.length >= prefs.studentid_min_length) {
    var source = getSource(prefs.default_source);


    if (doesCacheExist(studentId) && !isCacheOutdated(studentId) && prefs.cache && !forceReCache) {
        printTable(source.parseData(readCache(studentId)));
        console.log(getTimeStamp() + ': ' + studentId + ' loaded from cache.');
    } else {
    	spinner.start();
        fetchSchedule(source.getUrl(studentId), function(data) {
        	spinner.stop(true);
            //Error fetching schedule
            if (data.error) {
                console.warn(getTimeStamp() + ": Something went wrong fetching the schedule.");
                return;
            }

            //console.log(data);
            var parsedData = source.parseData(data);
            //console.log(parsedData);

            if(parsedData.error){
				console.warn(getTimeStamp() + ": No schedule for this student id found.");
                return;
            }

            printTable(parsedData);
            if (prefs.cache)
                updateCache(data, studentId);
        });

    }

} else if (studentId.length == 0) {
    printUsage();
} else {
    console.warn(getTimeStamp() + ": Invalid student id.");
    printUsage();
}

/*
 *	Usage print
 */

function printUsage() {
	console.log("\nAuSkema version " + pjson.version + " by Nauer \n" + pjson.description + "\n");
	console.log("Usage: auskema <studentID> <option>\n");
	console.log("Where <studentID> is your au student id ex. 201512345\n");
	console.log("And <option> can be one of:");
	console.log("--force, --clear-cache\n");
	console.log("auskema <studentID> \t\tFetches the schedule for the given id");
	console.log("auskema <studentID> --force \tFetches the schedule for the given id even if it is cached");
	console.log("auskema --clear-cache  \t\tclears the schedule cache\n");
	console.log("NOTE: --clear-cache do not need a student id. Further preferences can be changed in the config.json file in the app main folder");

}


/*
 *	Helping methodes
 */

function fetchSchedule(url, callback) {

    request({
        url: url
    }, function(error, response, body) {

        if (!error && response.statusCode === 200) {
        	callback(body);
        } else {
            callback({
                error: error
            });
        }
    });
}

function printTable(json) {

    var table = new Table(prefs.table_options);

    table.push(
        ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    );

    //Generate hour rows
    var hours = [];
    for (var i = 8; i <= 16; i++) {
        var digit = i;
        if (digit.length == 1)
            digit = '0' + digit;

        hours.push([digit + ':00', '', '', '', '', ''])
    }

    //Insert coures
    for (var i = 0; i < json.length; i++) {
        for (var j = json[i].from; j < json[i].to; j++) {
            (hours[j - 8])[json[i].day] = json[i].text;
        }
    };

    //Insert rows
    for (var i = 0; i < hours.length; i++) {
        table.push(hours[i]);
    };

    console.log(table.toString());
}

function getSource(name) {
    try {
        return require('./sources/' + name + '.js');
    } catch (e) {
        console.log(getTimeStamp() + ': The parser "' + name + '" does not exsist.');
        //console.log(e)
    }
}

function getTimeStamp() {
    var date = new Date();
    return date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}

/*
 *	Json caching
 */

function updateCache(json, studentId) {

    var newjson = {
        timestamp: (new Date() / 1000) / 60,
        data: json
    };

    fs.writeFile(__dirname + "/cache/" + studentId + ".json", JSON.stringify(newjson), function(err) {
        if (err)
            console.log(getTimeStamp() + ': Failed to write cache for ' + studentId);
        else
            console.log(getTimeStamp() + ': Cache for ' + studentId + ' was updated and will be kept for ' + prefs.cache_time_minutes + ' minutes');
    });

}

function doesCacheExist(studentId) {
    return fs.existsSync(__dirname + '/cache/' + studentId + '.json');
}

function isCacheOutdated(studentId) {
    var json = fs.readJsonSync(__dirname + '/cache/' + studentId + '.json', {
        throws: false
    });

    var stamp = json.timestamp;
    return ((((new Date() / 1000) / 60) - stamp) > prefs.cache_time_minutes);
}

function readCache(studentId) {
    return fs.readJsonSync(__dirname + '/cache/' + studentId + '.json', {
        throws: false
    }).data;
}

function clearCache() {
    fs.emptyDir(__dirname + '/cache/', function(err) {
        if (err)
            console.log(getTimeStamp() + ': Could not clear cache.');
        else
            console.log(getTimeStamp() + ': Cache cleared.');
    })

}