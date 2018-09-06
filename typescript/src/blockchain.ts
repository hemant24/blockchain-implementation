import * as CryptoJS from 'crypto-js'
import {broadcastLatest} from './p2p'

class Block {
    /*
    public index : number;
    public hash : string;
    public previousHash : string;
    public timestamp: number;
    public data : string;
    */

    constructor(public index : number, 
                public hash : string, 
                public previousHash : string,
                public timestamp: number,
                public data : string){}
}

const genesisBlock : Block = new Block(
    0,
    '98afd75b978eb70696d9bbbb99211efa535208c8520b62331a2d007571c3b072',
    '',
    1465154705,
    "my first block"
)

const generateNextBlock = (data : string) : Block => {
    const previousBlock : Block = getLastestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp : number = new Date().getTime()/1000;
    const nextHash : string = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, data);
    const block : Block =  new Block(nextIndex, nextHash,previousBlock.hash, nextTimestamp, data );
    if(addBlockToBlockchain(block)){
        broadcastLatest();
    }
    return block;
}



const addBlockToBlockchain = (block : Block) : boolean =>{
    if(isValidNewBlock(block, getLastestBlock())){
        blockchain.push(block);
        return true
    }
    return false;
}

const getLastestBlock = () : Block => {
    return blockchain[blockchain.length - 1];
}

const calculateHash = (index : number, previousHash : string, 
    timestamp : number, data : string) : string => {
        return CryptoJS.SHA256(index + previousHash + timestamp + data).toString()
}

const calculateHashForBlock = (block : Block) : string => {

    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
}

const isValidNewBlock = (newBlock : Block, previousBlock : Block) => {
    if(previousBlock.index + 1 !== newBlock.index){
        console.log('invalid index');
        return false;
    }else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
}

const isValidBlockStructure = (block : Block) => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'string';
}

const isValidChain = (blockchainToValidate : Block[]) : boolean => {
    const isValidGenesis = (block : Block) : boolean => {
        return JSON.stringify(genesisBlock) === JSON.stringify(block);
    }
    if(!isValidGenesis(blockchainToValidate[0])){
        return false;
    }
    for(let i = 1 ; i < blockchainToValidate.length ; i++){
        if(!isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i-1]))
            return false
    }
    return true;
}


const replaceChain = (newBlocks : Block[]) => {
    if(isValidChain(newBlocks) && newBlocks.length > blockchain.length){
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        //broadcastLatest();
    } else {
        console.log('Received blockchain invalid');
    }
}

const getBlockchain = () : Block[] => blockchain;

let blockchain : Block[] = [genesisBlock];

export{
    getLastestBlock, Block, isValidBlockStructure, 
    isValidNewBlock, addBlockToBlockchain, replaceChain,
    getBlockchain, generateNextBlock
}