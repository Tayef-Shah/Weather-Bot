'use strict';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    express = require('express'),
    request = require('request'),
    body_parser = require('body-parser'),
    //XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest,
    app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.MESSENGER_APP_SECRET;

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN;

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = process.env.SERVER_URL;

const API_KEY = process.env.OPEN_WEATHER_API_KEY;
const API_URL = "http://api.openweathermap.org/data/2.5/";


if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Missing config values");
    process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function (req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VALIDATION_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageText = message.text;

    if (messageText) {
        //var weatherRequest = new XMLHttpRequest();
        if(messageText.includes("!wtoday")) {
            /*
            weatherRequest.open("GET", "http://api.openweathermap.org/data/2.5/weather?q=London,uk&appid=7dcd47e7d9822e605a5ee663d66c2135", true);
            weatherRequest.onload = function() {
                console.log(JSON.stringify(this.response));
                //var data = JSON.parse(this.response);
                
                if(weatherRequest >= 200 && weatherRequest.status < 400) {
                    data.forEach(stuff => {
                        console.log(stuff);
                    });
                } else {
                    console.log("error");
                } 
            } 
            weatherRequest.send(); */
            request({url: "http://api.openweathermap.org/data/2.5/weather?q=London,uk&appid=7dcd47e7d9822e605a5ee663d66c2135", json: true}, function(error, response, body) {
                body.main.forEach(function(data) {
                    var measurement = {
                        temp: data.temp,
                        pressure: data.pressure
                    };
                    console.log(data);
                })
            }) 
            sendTextMessage(senderID, "Weather Today");
          }
        else if (messageText.includes("!wtmrw")) {
            sendTextMessage(senderID, "Weather Tomorrow");
          } 
        else if (messageText.includes("get started")){
            sendGetStarted(senderID);
          } 
        else {
            sendTextMessage(senderID, messageText);
        } 
    }
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event){
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " + "at %d", senderID, recipientID, payload, timeOfPostback);

    switch(payload){

        case 'get_started':
          sendGetStarted(senderID);
          break;
        case 'w_today':
          receivedMessage(senderID, "!wtoday");
          break;
        case 'w_tomorrow':
          receivedMessage(senderID, "!wtmrw");
          break;

        default:
          sendTextMessage(senderID, "Postback called");
    }

}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: "DEVELOPER_DEFINED_METADATA"
        }
    };
    callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendGetStarted(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",

                payload: {
                    template_type: "button",
                    text: "Hi, I'm Weather Bot! Tap a forecast to view more information.",
                    buttons: [{
                        type: "postback",
                        title: "Weather Today",
                        payload: "w_today"
                    }, {
                        type: "postback",
                        title: "Weather Tomorrow",
                        payload: "w_tomorrow"
                    }]
                }
            }
        }
    };
  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
    console.log(messageData);
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}