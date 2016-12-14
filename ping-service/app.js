'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const pubsub = require('@google-cloud/pubsub');

const app = express();


app.use(bodyParser.json({limit: '500kb'}));
app.use(bodyParser.urlencoded({limit: '500kb', extended: true}));

const projectId = process.env.GCLOUD_PROJECT;
const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const pubsubClient = pubsub({
    projectId: projectId,
    keyFilename: keyFileName
});
const topic = pubsubClient.topic('pings');

app.post('/ping', function (req, res) {

    // todo: https support.
    // todo: redirect support.
    // todo: consider using https://www.npmjs.com/package/request

    try {
        let requestBody = req.body;

        const options = {
            host: requestBody.host,
            path: requestBody.path,
            method: 'HEAD'
        };

        let callback = function (response) {
            let str = '';

            //another chunk of data has been recieved, so append it to `str`
            response.on('data', function (chunk) {
                str += chunk;
            });

            //the whole response has been recieved, so we just print it out here
            response.on('end', function () {
                const timeStamp2 = process.hrtime();
                const deltaNs = ((timeStamp2[0] * 1e9 + timeStamp2[1]) - (timeStamp1[0] * 1e9 + timeStamp1[1]));

                res.writeHead(200, {'Content-Type': 'application/json'});

                const responseEntity = {
                    date: Date.now(),
                    host: requestBody.host,
                    path: requestBody.path,
                    status: res.statusCode,
                    deltaNs: deltaNs
                };

                res.end(JSON.stringify(responseEntity));

                topic.publish(responseEntity, function (results) {
                    console.log("message published: " + JSON.stringify(responseEntity));
                });
            });
        };

        const timeStamp1 = process.hrtime();
        http.request(options, callback).end();
    } catch (e) {
        console.log(e);
    }
});

app.listen(8080);
