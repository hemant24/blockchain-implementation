import * as P2P from './p2p'
import  express from 'express'

import {getBlockchain, generateNextBlock, Block} from './blockchain'

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

    app.post('/mintBlock', (req, res) => {
        const newBlock : Block = generateNextBlock("");
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

    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort);
    })
}


P2P.initP2PServer(p2pPort)
initHttpServer(httpPort);