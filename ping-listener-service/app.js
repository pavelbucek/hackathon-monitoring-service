'use strict';

const pubsub = require('@google-cloud/pubsub');
const Datastore = require('@google-cloud/datastore');
const infiniteLoop = require('infinite-loop');

const projectId = process.env.GCLOUD_PROJECT;
const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const pubsubClient = pubsub({
    projectId: projectId,
    keyFilename: keyFileName
});

const topic = pubsubClient.topic('pings');
const subscription = topic.subscription('pings');

const datastore = Datastore({
    projectId: projectId,
    keyFilename: keyFileName
});

function pullMessages() {

    console.log('polling for messages...');
    subscription.pull({returnImmediately: false})
        .then((results) => {
            let messages = results[0];

            messages.forEach((message) => {
                console.log(`received message: %d %j %j %d`, message.id, message.data, message.attributes, message.ackId);

                let jsonMessage = message.data;

                datastore.save({
                    key: datastore.key('ping-entity'),
                    data: jsonMessage
                });

                message.ack();
            });
        });
}

new infiniteLoop().setInterval(1000).add(pullMessages, []).run();
