var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var gdrive = {};
var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
var credentials = {};

// Initialize credentials
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  content = JSON.parse(content);
  credentials.clientSecret = content.web.client_secret;
  credentials.clientId = content.web.client_id;
  credentials.redirectUrl = content.web.redirect_uris[0];
});

// authenticate the authorization code to get an access token
// @return {token, error} -> error is true and token in null if there is an error, else error is false
gdrive.authenticate = function(code, callback) {
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl);

  oauth2Client.getToken(code, function(err, token) {
    if (err) {
      callback(null, true);
      return;
    }
    oauth2Client.credentials = token;
    callback(oauth2client, false);
  });
}

// gets the user name of the token
// @return {username, error} -> error is true and username is null if there is an error, else error is false
gdrive.getUserName = function(auth, callback) {
  var service = google.drive('v3');
  service.about.get({
    auth: auth
  }, function(err, response) {
    if(err) {
      callback(null, true);
      return;
    } else {
      callback(response, false);
    }
  })
}

module.exports = gdrive;
