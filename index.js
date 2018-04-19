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

function pushVideoEntryToFirebase(key, callback) {
    console.log('Adding video entry to firebase at key:', key);
    var database = firebase.database().ref();
    database.child('videos').child(key)
        .set({
            transcoding: true
        })
        .then(function () {
            callback(null, 'Video record saved to firebase');
        })
        .catch(function (err) {
            callback(err);
        });
}

exports.handler = function (event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;
    var key = event.Records[0].s3.object.key;
    var sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));
    var outputKey = sourceKey.split('.')[0];
    var uniqueVideoKey = outputKey.split('/')[0];
    var params = {
        PipelineId: process.env.ELASTIC_TRANSCODER_PIPELINE_ID,
        Input: {
            Key: sourceKey
        },
        Outputs: [
            {
                Key: outputKey + '-720p' + '.mp4',
                PresetId: '1351620000001-000010'
            }
        ]
    };
    elasticTranscoder.createJob(params, function (error, data) {
        if (error) {
            console.log('Error creating elastic transcoder job.');
            callback(error);
            return;
        }
        console.log('Elastic transcoder job created successfully');
        pushVideoEntryToFirebase(uniqueVideoKey, callback);
    });
};