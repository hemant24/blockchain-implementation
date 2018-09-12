"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
//const WebSocket = require('ws');
const blockchain_1 = require("./blockchain");
const sockets = [];
var MessageType;
(function (MessageType) {
    MessageType[MessageType["QUERY_LATEST"] = 0] = "QUERY_LATEST";
    MessageType[MessageType["QUERY_ALL"] = 1] = "QUERY_ALL";
    MessageType[MessageType["RESPONSE_BLOCKCHAIN"] = 2] = "RESPONSE_BLOCKCHAIN";
})(MessageType || (MessageType = {}));
class Message {
    constructor() {
        this.type = MessageType.QUERY_LATEST;
    }
}
const connectToPeer = (peer) => {
    const ws = new ws_1.default(peer);
    ws.on('open', () => {
        initConnection(ws);
    });
    ws.on('error', () => {
        console.log('connection failed');
    });
};
exports.connectToPeer = connectToPeer;
const initP2PServer = (p2pPort) => {
    const server = new ws_1.default.Server({ port: p2pPort });
    server.on('connection', (ws) => {
        initConnection(ws);
    });
    console.log('listening websocket p2p port on: ' + p2pPort);
};
exports.initP2PServer = initP2PServer;
const initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};
const JSONToObject = (data) => {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        console.log(e);
        return null;
    }
};
const initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        try {
            const message = JSONToObject(data);
            console.log('Received message: %s', JSON.stringify(message));
            switch (message.type) {
                case MessageType.QUERY_LATEST:
                    write(ws, responseLatestMsg());
                    break;
                case MessageType.QUERY_ALL:
                    write(ws, responseChainMsg());
                    break;
                case MessageType.RESPONSE_BLOCKCHAIN:
                    const receivedBlocks = JSONToObject(message.data);
                    handleBlockchainResponse(receivedBlocks);
                    break;
            }
        }
        catch (e) {
            console.log(e);
        }
    });
};
const handleBlockchainResponse = (receivedBlocks) => {
    if (receivedBlocks.length == 0) {
        console.log("received block chain size of 0");
        return;
    }
    const lastetBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!blockchain_1.isValidBlockStructure(lastetBlockReceived)) {
        console.log('block structuture not valid');
        return;
    }
    const lastestBlockHeld = blockchain_1.getLastestBlock();
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
const queryAllMsg = () => ({
    type: MessageType.QUERY_ALL,
    data: null
});
const broadcastLatest = () => {
    sockets.forEach((ws) => { write(ws, responseLatestMsg()); });
};
exports.broadcastLatest = broadcastLatest;
const broadcast = (msg) => {
    sockets.forEach((ws) => { write(ws, msg); });
};
const write = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
const queryChainLengthMsg = () => ({
    type: MessageType.QUERY_LATEST,
    data: null
});
const responseChainMsg = () => ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(blockchain_1.getBlockchain())
});
const responseLatestMsg = () => ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([blockchain_1.getLastestBlock()])
});
const initErrorHandler = (ws) => {
    const closeConnection = (wsl) => {
        console.log('connection failed to peer: ' + wsl.url);
        sockets.splice(sockets.indexOf(wsl), 1);
    };
    ws.on('close', () => {
        closeConnection(ws);
    });
    ws.on('error', () => {
        closeConnection(ws);
    });
};
const getSockets = () => sockets;
exports.getSockets = getSockets;
