'use strict';

/*
 *	Endpoint for api
 */
var host = "http://foo.bar/";

/*
 *	This should return the url which will retreive the
 *	the schedule data which will be parsed.
 */
exports.getUrl = function(studentid) {
    return host + studentid;
}

/*
 *	This should parse the data from the above url into
 *	a JSON object which follows the scheme below
 */
exports.parseData = function(data) {
    return JSON.parse(data);
}



/*
	The parse method above should return a JSON object
	with the follow scheme.
	NOTE: This object should only contain the current
	or relevant week.


		[
			{
				from: 12,
				to: 14,
				day: 1,
				text: 'Databases'
			},
			{
				from: 15,
				to: 16,
				day: 1,
				text: 'Programming 101'
			}
		]


	In the above example the text for each time and day
	will be the current time. So the position in the array
	of the day decides which time of day.

*/
