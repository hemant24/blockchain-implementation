import * as P2P from './p2p'
import  express from 'express'

import {getBlockchain, generateNextBlock, Block, generatenextBlockWithTransaction, getAccountBalance} from './blockchain'
import {initWallet} from './wallet';


const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;
const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;


const initHttpServer = (myHttpPort : number) => {
    const app: express.Application = express();

    app.use(express.json())

    app.use((err, req, res, next) => {
        if(err){
            res.status(400).send(err.message)
        }
    })

    app.get('/blocks', (req, res) => {
        res.send(getBlockchain())
    })

    app.get('/balance', (req, res) => {
        const balance: number = getAccountBalance();
        res.send({'balance': balance});
    });

    app.post('/mintBlock', (req, res) => {
        const newBlock : Block = generateNextBlock();
        res.send(newBlock)
    })

    app.get('/peers', (req, res) => {
        res.send(P2P.getSockets().map((s : any) => s._socket.remoteAddress + ':' + s._socket.remotePort)  )
    })


    app.post('/peers', (req, res) => {
        let {peer} = req.body
        P2P.connectToPeer(peer);
        res.send('done')
    })

    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = generatenextBlockWithTransaction(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort);
    })
}


P2P.initP2PServer(p2pPort)
initHttpServer(httpPort);
initWallet();