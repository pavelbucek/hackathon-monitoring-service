'use strict';

const http = require('http');
const Datastore = require('@google-cloud/datastore');
const AsyncPolling = require('async-polling');

const projectId = process.env.GCLOUD_PROJECT;
const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const datastore = Datastore({
    projectId: projectId,
    keyFilename: keyFileName
});

function cronCheck() {

    console.log('cron check started...');

    const query = datastore.createQuery('ping-cron');

    datastore.runQuery(query, function (err, entities) {
        if (err) {
            console.log("error while getting data from the datastore: " + err);
            return;
        }

        if (entities.length == 0) {
            // initial data

            datastore.save({
                key: datastore.key(['ping-cron', 'www.facebook.com/']),
                data: {
                    host: 'www.facebook.com',
                    path: '/',
                    interval: 1000,
                    lastPing: 0

                }
            });
            datastore.save({
                key: datastore.key(['ping-cron', 'www.google.com/']),
                data: {
                    host: 'www.google.com',
                    path: '/',
                    interval: 1000,
                    lastPing: 0
                }
            });
            datastore.save({
                key: datastore.key(['ping-cron', 'www.oracle.com/']),
                data: {
                    host: 'www.oracle.com',
                    path: '/',
                    interval: 1000,
                    lastPing: 0
                }
            });
            datastore.save({
                key: datastore.key(['ping-cron', 'aws.amazon.com/']),
                data: {
                    host: 'aws.amazon.com',
                    path: '/',
                    interval: 1000,
                    lastPing: 0
                }
            });
        }

        console.log("entities.len: " + entities.length);

        const now = Date.now();

        entities.forEach((entity) => {

            // check interval + call ping service
            if (now > (entity.lastPing + entity.interval)) {

                console.log("pinging: " + JSON.stringify(entity));

                const options = {
                    host: 'ping-service',
                    path: '/ping',
                    port: 8080,
                    method: 'POST',
                    headers: {'content-type': 'application/json'}
                };

                const req = http.request(options);
                req.on('response', function () {
                    entity.lastPing = Date.now();
                    datastore.save({
                        key: datastore.key(['ping-cron', entity.host + entity.path]),
                        method: 'update',
                        data: entity
                    })
                });
                req.on('error', function (err) {
                    console.log("error when accessing: " + entity.host + ": " + err);
                });
                req.write(JSON.stringify({
                    host: entity.host,
                    path: entity.path
                }));
                req.end();
            }
        });
    });
}

global.setInterval(cronCheck, 1000);
