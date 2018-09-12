import WebSocket from 'ws';
import {Server} from 'ws'

//const WebSocket = require('ws');

import {
    getLastestBlock, Block, isValidBlockStructure, isValidNewBlock, 
    addBlockToBlockchain, replaceChain, getBlockchain
} from './blockchain'

const sockets: WebSocket[] = []

enum MessageType {
    QUERY_LATEST = 0,
    QUERY_ALL = 1,
    RESPONSE_BLOCKCHAIN = 2
}

class Message {
    public type: MessageType = MessageType.QUERY_LATEST;
    public data: any;
}

const connectToPeer = (peer : string): void => {
    const ws : any = new WebSocket(peer);

    ws.on('open', ()=>{
        initConnection(ws);
    })
    ws.on('error', () => {
        console.log('connection failed');
    });
}

const initP2PServer = (p2pPort : number) => {
    const server : Server = new WebSocket.Server({port: p2pPort});
    server.on('connection', (ws : WebSocket)=> {
        
        initConnection(ws);
    })
    console.log('listening websocket p2p port on: ' + p2pPort);
}


const initConnection = (ws : WebSocket) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
}

const JSONToObject =<T> (data : string) : T | null => {
    try{
        return JSON.parse(data)
    }catch(e){
        console.log(e);
        return null;
    }
}

const initMessageHandler = (ws : WebSocket) => {
    ws.on('message', (data : string) => {
        try{
            const message : Message = <Message>JSONToObject(data)
            console.log('Received message: %s', JSON.stringify(message));
            switch(message.type){
                case MessageType.QUERY_LATEST : 
                    write(ws, responseLatestMsg());
                break;
                case MessageType.QUERY_ALL : 
                    write(ws, responseChainMsg());
                break;
                case MessageType.RESPONSE_BLOCKCHAIN :
                    const receivedBlocks = <Block[]>JSONToObject(message.data);
                    handleBlockchainResponse(receivedBlocks);
                break;
            }
        } catch (e) {
            console.log(e);
        }
    })
}

const handleBlockchainResponse = (receivedBlocks : Block[]) => {
    if(receivedBlocks.length == 0 ){
        console.log("received block chain size of 0")
        return;
    }

    const lastetBlockReceived : Block = receivedBlocks[receivedBlocks.length - 1]
    if(!isValidBlockStructure(lastetBlockReceived)){
        console.log('block structuture not valid');
        return;
    }
    const lastestBlockHeld = getLastestBlock();
    if(lastestBlockHeld.index < lastetBlockReceived.index){
        if(lastestBlockHeld.hash == lastetBlockReceived.previousHash){
            addBlockToBlockchain(lastetBlockReceived)
        }else if(receivedBlocks.length === 1){
            console.log('We have to query the chain from our peer');
            broadcast(queryAllMsg())
        }else{
            console.log('Received blockchain is longer than current blockchain');
            replaceChain(receivedBlocks);
        }

    }else{
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }

}

const queryAllMsg = () : Message => ({
    type: MessageType.QUERY_ALL,
    data : null
})

const broadcastLatest = () => {
    sockets.forEach((ws) => { write(ws, responseLatestMsg())})
}

const broadcast = (msg : Message) => {
    sockets.forEach((ws) => { write(ws, msg)})
}


const write = (ws : WebSocket, msg : Message) : void => {
    ws.send(JSON.stringify(msg))
}

const queryChainLengthMsg = () : Message => ({
    type : MessageType.QUERY_LATEST,
    data : null
})

const responseChainMsg = () : Message => ({
    type : MessageType.RESPONSE_BLOCKCHAIN,
    data : JSON.stringify(getBlockchain())
})

const responseLatestMsg = () : Message => ({
    type : MessageType.RESPONSE_BLOCKCHAIN,
    data : JSON.stringify([getLastestBlock()])
})



const initErrorHandler = (ws : WebSocket) => {
    const closeConnection = (wsl : WebSocket) => {
        console.log('connection failed to peer: ' + wsl.url);
        sockets.splice(sockets.indexOf(wsl), 1);
    }

    ws.on('close', () => {
        closeConnection(ws);
    })
    ws.on('error', () => {
        closeConnection(ws);
    })
}

const getSockets = () => sockets;

export{
    initP2PServer, getSockets, connectToPeer, broadcastLatest
}