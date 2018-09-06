"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var P2P = __importStar(require("./p2p"));
var express_1 = __importDefault(require("express"));
var blockchain_1 = require("./blockchain");
var p2pPort = parseInt(process.env.P2P_PORT) || 6001;
var httpPort = parseInt(process.env.HTTP_PORT) || 3001;
var initHttpServer = function (myHttpPort) {
    var app = express_1.default();
    app.use(express_1.default.json());
    app.use(function (err, req, res, next) {
        if (err) {
            res.status(400).send(err.message);
        }
    });
    app.get('/blocks', function (req, res) {
        res.send(blockchain_1.getBlockchain());
    });
    app.post('/mintBlock', function (req, res) {
        var newBlock = blockchain_1.generateNextBlock("");
        res.send(newBlock);
    });
    app.get('/peers', function (req, res) {
        res.send(P2P.getSockets().map(function (s) { return s._socket.remoteAddress + ':' + s._socket.remotePort; }));
    });
    app.post('/peers', function (req, res) {
        var peer = req.body.peer;
        P2P.connectToPeer(peer);
        res.send('done');
    });
    app.listen(myHttpPort, function () {
        console.log('Listening http on port: ' + myHttpPort);
    });
};
P2P.initP2PServer(p2pPort);
initHttpServer(httpPort);
