"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = __importDefault(require("ws"));
//const WebSocket = require('ws');
var blockchain_1 = require("./blockchain");
var sockets = [];
var MessageType;
(function (MessageType) {
    MessageType[MessageType["QUERY_LATEST"] = 0] = "QUERY_LATEST";
    MessageType[MessageType["QUERY_ALL"] = 1] = "QUERY_ALL";
    MessageType[MessageType["RESPONSE_BLOCKCHAIN"] = 2] = "RESPONSE_BLOCKCHAIN";
})(MessageType || (MessageType = {}));
var Message = /** @class */ (function () {
    function Message() {
        this.type = MessageType.QUERY_LATEST;
    }
    return Message;
}());
var connectToPeer = function (peer) {
    var ws = new ws_1.default(peer);
    ws.on('open', function () {
        initConnection(ws);
    });
    ws.on('error', function () {
        console.log('connection failed');
    });
};
exports.connectToPeer = connectToPeer;
var initP2PServer = function (p2pPort) {
    var server = new ws_1.default.Server({ port: p2pPort });
    server.on('connection', function (ws) {
        initConnection(ws);
    });
    console.log('listening websocket p2p port on: ' + p2pPort);
};
exports.initP2PServer = initP2PServer;
var initConnection = function (ws) {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};
var JSONToObject = function (data) {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        console.log(e);
        return null;
    }
};
var initMessageHandler = function (ws) {
    ws.on('message', function (data) {
        try {
            var message = JSONToObject(data);
            console.log('Received message: %s', JSON.stringify(message));
            switch (message.type) {
                case MessageType.QUERY_LATEST:
                    write(ws, responseLatestMsg());
                    break;
                case MessageType.QUERY_ALL:
                    write(ws, responseChainMsg());
                    break;
                case MessageType.RESPONSE_BLOCKCHAIN:
                    var receivedBlocks = JSONToObject(message.data);
                    handleBlockchainResponse(receivedBlocks);
                    break;
            }
        }
        catch (e) {
            console.log(e);
        }
    });
};
var handleBlockchainResponse = function (receivedBlocks) {
    if (receivedBlocks.length == 0) {
        console.log("received block chain size of 0");
        return;
    }
    var lastetBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!blockchain_1.isValidBlockStructure(lastetBlockReceived)) {
        console.log('block structuture not valid');
        return;
    }
    var lastestBlockHeld = blockchain_1.getLastestBlock();
    if (lastestBlockHeld.index < lastetBlockReceived.index) {
        if (lastestBlockHeld.hash == lastetBlockReceived.previousHash) {
            blockchain_1.addBlockToBlockchain(lastetBlockReceived);
        }
        else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllMsg());
        }
        else {
            console.log('Received blockchain is longer than current blockchain');
            blockchain_1.replaceChain(receivedBlocks);
        }
    }
    else {
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
};
var queryAllMsg = function () { return ({
    type: MessageType.QUERY_ALL,
    data: null
}); };
var broadcastLatest = function () {
    sockets.forEach(function (ws) { write(ws, responseLatestMsg()); });
};
exports.broadcastLatest = broadcastLatest;
var broadcast = function (msg) {
    sockets.forEach(function (ws) { write(ws, msg); });
};
var write = function (ws, msg) {
    ws.send(JSON.stringify(msg));
};
var queryChainLengthMsg = function () { return ({
    type: MessageType.QUERY_LATEST,
    data: null
}); };
var responseChainMsg = function () { return ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(blockchain_1.getBlockchain())
}); };
var responseLatestMsg = function () { return ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([blockchain_1.getLastestBlock()])
}); };
var initErrorHandler = function (ws) {
    var closeConnection = function (wsl) {
        console.log('connection failed to peer: ' + wsl.url);
        sockets.splice(sockets.indexOf(wsl), 1);
    };
    ws.on('close', function () {
        closeConnection(ws);
    });
    ws.on('error', function () {
        closeConnection(ws);
    });
};
var getSockets = function () { return sockets; };
exports.getSockets = getSockets;
