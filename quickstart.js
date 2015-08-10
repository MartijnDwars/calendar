var fs = require('fs');
var calendar = require('./calendar');
var google = require('googleapis');
var inquirer = require('inquirer');
var R = require('ramda');
var Q = require('q');

/**
 * Bootstrap code
 */
Q.nfcall(fs.readFile, 'client_secret.json').then(function (content) {
  calendar.authorize(JSON.parse(content), listEvents);
}).catch(function (error) {
  console.error(error);
});

/**
 * Lists the next 20 events
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'peehplbqqj3ifll8ju4t4tejqfqcuuqn@import.calendar.google.com',
    timeMin: (new Date()).toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      var choices = events.map(function (event) {
        var start = event.start.dateTime || event.start.date;

        return {
          name: start + ' - ' + event.summary,
          value: event
        }
      });

      inquirer.prompt([{
        type: 'checkbox',
        message: 'Which events do you want to copy?',
        name: 'events',
        choices: choices
      }], function (answers) {
        var calls = answers.events.map(function (event) {
          return Q.nfcall(calendar.events.import, {
            auth: auth,
            calendarId: '2bytes.nl_hmoa56vcm1f3s3g43gmqjkdp8k@group.calendar.google.com',
            resource: R.pick(['start', 'end', 'iCalUID', 'summary', 'location'], event)
          });
        });

        Q.all(calls).then(function () {
          console.log('Copied ' + answers.events.length + ' events');
        });
      });
    }
  });
}
