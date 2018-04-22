'use strict';
var AWS = require('aws-sdk');
var firebase = require('firebase-admin');
var elasticTranscoder = new AWS.ElasticTranscoder({
    region: process.env.ELASTIC_TRANSCODER_REGION
});

var serviceAccount = require(process.env.SERVICE_ACCOUNT);

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

exports.handler = function(event, context, callback) {

    context.callbackWaitForEmptyEventLoop = false;

    var message = JSON.parse(event.Records[0].Sns.Message);

    var key = message.Records[0].s3.object.key;
    var bucket = message.Records[0].s3.bucket.name;
    var sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));

    var uniqueVideoKey = sourceKey.split('/')[0];

    var database = firebase.database().ref();

    database.child('videos').child(uniqueVideoKey).set({
        transcoding: false,
        key: key,
        bucket: process.env.S3
    }).catch(function(err) {
        callback(err);
    });
};