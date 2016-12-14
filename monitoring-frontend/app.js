'use strict';

const http = require('http');
const express = require('express');
const expressWs = require('express-ws');
const bodyParser = require('body-parser');
const pubsub = require('@google-cloud/pubsub');
const Datastore = require('@google-cloud/datastore');
const uuid = require('node-uuid');

const expressInstance = expressWs(express());
const app = expressInstance.app;

app.use(bodyParser.json({limit: '500kb'}));
app.use(bodyParser.urlencoded({limit: '500kb', extended: true}));

const projectId = process.env.GCLOUD_PROJECT;
const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const pubsubClient = pubsub({
    projectId: projectId,
    keyFilename: keyFileName
});

const datastore = Datastore({
    projectId: projectId,
    keyFilename: keyFileName
});

const topic = pubsubClient.topic('pings');

const instanceSubscriptionName = "autosub-" + uuid.v4();

app.use(express.static('public'));

app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {

    });
});

app.post('/ping', function (req, res) {
    // call ping-service and copy the result

    try {
        let requestBody = req.body;

        const options = {
            host: 'ping-service',
            path: '/ping',
            port: 8080,
            method: 'POST',
            headers: {'content-type': 'application/json'}
        };

        let callback = function (response) {
            let str = '';

            //another chunk of data has been recieved, so append it to `str`
            response.on('data', function (chunk) {
                str += chunk;
            });

            //the whole response has been received, send it to the web page
            response.on('end', function () {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(str);
            });
        };

        const request = http.request(options, callback);
        request.on('error', function (err) {
            console.log("error when accessing: " + options.host + ": " + err);
        });
        request.write(JSON.stringify({
            host: requestBody.host,
            path: requestBody.path
        }));
        request.end();


    } catch (e) {
        console.log(e);
    }
});

app.get('/table', function (req, res) {
    // call ping-service and copy the result

    try {

        const query = datastore.createQuery('ping-entity').limit(1000);

        datastore.runQuery(query, function (err, entities) {
            if (err) {
                console.log("error while getting data from the datastore: " + err);
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});

                res.write('{ "pings": [');
                let first = true;

                entities.forEach((entity) => {
                    if (first) {
                        first = false;
                    } else {
                        res.write(',')
                    }

                    res.write(JSON.stringify(entity));
                });

                res.end(']}');
            }
        });

    } catch (e) {
        console.log(e);
    }
});

topic.subscribe(instanceSubscriptionName)
    .then((results) => {
        const subscription = results[0];

        console.log(`Subscription ${subscription.name} created.`);

        return subscription;
    });

const subscription = topic.subscription(instanceSubscriptionName);

function pullMessages() {

    console.log('polling for messages...');
    subscription.pull({returnImmediately: false})
        .then((results) => {
            let messages = results[0];

            messages.forEach((message) => {
                message.ack();
                console.log(`received message: %d %j %j %d`, message.id, message.data, message.attributes, message.ackId);

                const wss = expressInstance.getWss('/');

                wss.clients.forEach(function (wsConnection) {
                    wsConnection.send(JSON.stringify({
                        type: 'ping',
                        data: message.data
                    }));
                });
            });
        });
}

function deleteSubscription() {
    return subscription.delete()
        .then(() => {
            console.log(`Subscription ${subscription.name} deleted.`);
        });
}

process.on('exit', function () {
    console.log("exit!");
    deleteSubscription();
});

process.on('SIGINT', function () {
    console.log("exit-siging!");
    deleteSubscription();
    process.exit();
});

global.setInterval(pullMessages, 1000);
app.listen(8080);
