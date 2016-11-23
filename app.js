#!/usr/bin/env node
'use strict';

//Import dependencies
var http = require('http');
var Table = require('cli-table');
var fs = require('fs-extra');
var request = require('request');
var Spinner = require('cli-spinner').Spinner;

//Import preferences
var prefs = require('./config.json');
var pjson = require('./package.json');

//make cache dir
fs.mkdirsSync(__dirname + '/cache/');

var spinner = new Spinner('fetching schedule.. %s');
spinner.setSpinnerString('|/-\\');

var options = require('commander');
options
  .version(pjson.version)
  .description(pjson.description + ".")
  .usage('[options] <studentID>')
  .option('-f, --force', 'Force download (even if cached)')
  .option('-c, --clear-cache', 'Clear the schedule cache (no studentID required)');

options.on('--help', function()
{
    console.log('  Examples:');
    console.log('');
    console.log('    $ auskema <studentID> \t\t# Fetches the schedule for the given id');
    console.log('    $ auskema <studentID> --force \t# Fetches the schedule for the given id even if it is cached');
    console.log('    $ auskema --clear-cache \t\t# Clears the schedule cache');
    console.log('');
    console.log("NOTE: Further preferences can be changed in the config.json file in the app main folder");
    console.log('--> By Nauer (Modified by Skeen)');
    console.log('');
});

options.parse(process.argv);

if (options.clearCache) {
    clearCache();
    return;
}

//Get student id from parm
var studentId = (options.args[0] || '');

//Check input and fetch schedule
if (studentId.length >= prefs.studentid_min_length) {
    var source = getSource(prefs.default_source);


    if (doesCacheExist(studentId) && !isCacheOutdated(studentId) && prefs.cache && !options.force) {
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
    options.help();
} else {
    console.warn(getTimeStamp() + ": Invalid student id.");
    options.help();
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

    // Generate sparse object representation, and find first and last lecture time
    var obj = {};
    var [first, last] = json.reduce(function([min,max],elem)
    {
        for (var j = elem.from; j < elem.to; j++) {
            obj[j] = (obj[j] || {});
            obj[j][elem.day] = elem.text;
        }
        return [Math.min(min, elem.from), Math.max(max, elem.to)];
    }, [24, 0]);

    var days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    table.push(days);

    //Insert rows
    for (var i = first; i < last; i++) 
    {
        // Fill in hour format
        obj[i] = (obj[i] || {});
        obj[i][0] = ('0' + i).substr(-2) + ':00';
        // Push the hour + lecture row
        table.push(days.map(function(_, j)
        {
            return (obj[i][j] || '');
        }));
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
