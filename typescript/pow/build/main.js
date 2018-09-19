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
const P2P = __importStar(require("./p2p"));
const express_1 = __importDefault(require("express"));
const blockchain_1 = require("./blockchain");
const wallet_1 = require("./wallet");
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;
const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
const initHttpServer = (myHttpPort) => {
    const app = express_1.default();
    app.use(express_1.default.json());
    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        }
    });
    app.get('/blocks', (req, res) => {
        res.send(blockchain_1.getBlockchain());
    });
    app.get('/balance', (req, res) => {
        const balance = blockchain_1.getAccountBalance();
        res.send({ 'balance': balance });
    });
    app.post('/mintBlock', (req, res) => {
        const newBlock = blockchain_1.generateNextBlock();
        res.send(newBlock);
    });
    app.get('/peers', (req, res) => {
        res.send(P2P.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/peers', (req, res) => {
        let { peer } = req.body;
        P2P.connectToPeer(peer);
        res.send('done');
    });
    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = blockchain_1.generatenextBlockWithTransaction(address, amount);
            res.send(resp);
        }
        catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });
    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort);
    });
};
P2P.initP2PServer(p2pPort);
initHttpServer(httpPort);
wallet_1.initWallet();
