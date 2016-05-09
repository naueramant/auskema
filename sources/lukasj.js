'use strict';

var host = "http://lukasj.org/auskema/";

exports.getUrl = function(studentid) {
    return host + studentid + "/json";
}

exports.parseData = function(data) {
    if(typeof data =='object')
        return {error: true};

    var json = JSON.parse(data);

    var result = [];

    var week = getWeekNumb();

    if(json.events.length <= 0)
        return {error: true};

    for (var i = json.events.length - 1; i >= 0; i--) {
        if (week > json.events[i].weekfrom && week < json.events[i].weekto) {
            result.push({
                from: json.events[i].from,
                to: json.events[i].to,
                day: json.events[i].dow,
                text: json.events[i].summary.replace(' ', '\n') + "\n" + json.events[i].description
            })
        }
    };

    return result;
}

function getWeekNumb() {

    // Create a copy of this date object
    var target = new Date();

    // ISO week date weeks start on monday
    // so correct the day number
    var dayNr = (target.getDay() + 6) % 7;

    // Set the target to the thursday of this week so the
    // target date is in the right year
    target.setDate(target.getDate() - dayNr + 3);

    // ISO 8601 states that week 1 is the week
    // with january 4th in it
    var jan4 = new Date(target.getFullYear(), 0, 4);

    // Number of days between target date and january 4th
    var dayDiff = (target - jan4) / 86400000;

    // Calculate week number: Week 1 (january 4th) plus the
    // number of weeks between target date and january 4th
    var weekNr = 1 + Math.ceil(dayDiff / 7);

    return weekNr;

}
