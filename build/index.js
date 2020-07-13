"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require("./router");
const winston = require("winston");
const line = require("@line/bot-sdk");
const logger = winston.createLogger({
    level: "info",
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: "log.log" }),
        new winston.transports.Console(),
    ],
});
const express = require("express");
require("dotenv").config();
const { gsrun, client } = require("./sheet");
const { replyMessage } = require("./reply");
const app = express();
const port = process.env.PORT || 5000;
const channel_id = process.env.channel_id;
const secret = process.env.secret;
const access_token = process.env.access_token;
const config = {
    channelAccessToken: access_token,
    channelSecret: secret,
};
let db = {};
let messageRouter;
client.authorize(async (err, res) => {
    if (err) {
        console.log(err);
    }
    else {
        db = await gsrun(client);
        console.log("db listed");
        messageRouter = new router.MessageRouter({
            week: new router.LegacyWeekOverview(db),
        }, {
            week: ["week", "wk", "summary", "sum", "overview"],
        }, new router.LegacyPassthru(db));
    }
});
const lineClient = new line.Client(config);
function handleEvent(event) {
    if (event.type !== "message" || event.message.type !== "text") {
        return Promise.resolve(null);
    }
    let msg = event.message.text;
    let userId = event.source.userId;
    let theReply = messageRouter.reply(msg);
    lineClient.getProfile(userId).then((profile) => {
        logger.info(profile.displayName + " says " + msg);
    });
    return lineClient.replyMessage(event.replyToken, theReply);
}
app.get("/", (req, res) => {
    res.send("Running. . .");
    console.log(req.msg);
});
app.post("/webhook", line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
        console.error(err);
        res.status(500).end();
    });
});
app.get("/test/:cmd", (req, res) => {
    let cmd = req.params.cmd;
    if (!cmd)
        res.status(500).end();
    // console.dir(replyMessage(cmd, db).reply);
    res.json(messageRouter.reply(cmd));
    res.status(200).end();
});
app.get("/api/:date", (req, res) => {
    let date = req.params.date.replace("-", "/").replace("-", "/");
    if (db[date] === undefined)
        res.json({ status: "Notfound" });
    else
        res.json(db[date]);
    res.status(200).end();
});
app.listen(port);
//# sourceMappingURL=index.js.map