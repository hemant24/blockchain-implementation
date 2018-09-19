import * as CryptoJS from 'crypto-js'
import {broadcastLatest} from './p2p'
import {hexToBinary} from './utils'
import {getCoinbaseTransaction, isValidAddress, processTransactions, Transaction, UnspentTxOut} from './transactins';
import {createTransaction, getBalance, getPrivateFromWallet, getPublicFromWallet} from './wallet';

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
                public data: Transaction[],
                public difficulty : number,
                public nonce : number){}
}

const genesisBlock : Block = new Block(
    0,
    '98afd75b978eb70696d9bbbb99211efa535208c8520b62331a2d007571c3b072',
    '',
    1465154705,
    [],
    0,
    0
)

const BLOCK_GENERATION_INTERVAL: number = 10;

const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

let unspentTxOuts: UnspentTxOut[] = [];

const getAccountBalance = (): number => {
    return getBalance(getPublicFromWallet(), unspentTxOuts);
};

const getDifficulty = (aBlockchain : Block[]): number => {
    const latestBlock: Block = aBlockchain[aBlockchain.length -1];
    if(latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0){
        return getAdjustedDifficulty(aBlockchain);
    }else{
        return aBlockchain[aBlockchain.length -1 ].difficulty;
    }
}

const getAdjustedDifficulty = (aBlockchain : Block[]): number => {
    const previousAdjustedBlock: Block = aBlockchain[aBlockchain.length  - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const latestBlock = aBlockchain[aBlockchain.length - 1];
    const expectedTime = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const actualTimeTaken = latestBlock.timestamp - previousAdjustedBlock.timestamp;
    console.log('actualTimeTaken ' + actualTimeTaken)
    if(actualTimeTaken < (expectedTime/2)){
        return previousAdjustedBlock.difficulty + 1;
    }else  if(actualTimeTaken > (expectedTime/2)){
        let d =  previousAdjustedBlock.difficulty - 1;
        if (d < 0){
            return 0
        }else{
            return d
        }
    }else {
        previousAdjustedBlock.difficulty
    }
}

const generateRawNextBlock = (data: Transaction[]) : Block => {
    const previousBlock : Block = getLastestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp : number = getCurrentTimestamp();
    const difficulty: number = getDifficulty(getBlockchain());
    const block : Block =  findBlock(nextIndex, previousBlock.hash, nextTimestamp, data, difficulty)
    if(addBlockToBlockchain(block)){
        broadcastLatest();
    }
    return block;
}

const generateNextBlock = () => {
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLastestBlock().index + 1);
    const blockData: Transaction[] = [coinbaseTx];
    return generateRawNextBlock(blockData);
};

const generatenextBlockWithTransaction = (receiverAddress: string, amount: number) => {
    if (!isValidAddress(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLastestBlock().index + 1);
    const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(), unspentTxOuts);
    const blockData: Transaction[] = [coinbaseTx, tx];
    return generateRawNextBlock(blockData);
};


const findBlock = (index: number, previousHash: string, timestamp: number, data: Transaction[], difficulty: number): Block => {
    let nonce: number = 0;
    while(true){
        //console.log('checking nonce ' , nonce)
        const hash: string = calculateHash(index, previousHash, timestamp, data, difficulty, nonce)
        if(hashMatchesDifficulty(hash, difficulty)){
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++
    }
}

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean =>{
    const hashInBinary: string  = hexToBinary(hash);
    //console.log('hashInBinary ', hashInBinary)
    //console.log('difficulty ' , difficulty)
    const requiredPrefix : string = '0'.repeat(difficulty);
    //console.log('required prefix is ' +  requiredPrefix + ' ;')
    //console.log('is statisfiled ', hashInBinary.startsWith(requiredPrefix))
    return hashInBinary.startsWith(requiredPrefix);
}

const addBlockToBlockchain = (block : Block) : boolean =>{
    if(isValidNewBlock(block, getLastestBlock())){
        const retVal: UnspentTxOut[] = processTransactions(block.data, unspentTxOuts, block.index);
        if (retVal === null) {
            return false;
        } else {
            blockchain.push(block);
            unspentTxOuts = retVal;
            return true;
        }
    }
    return false;
}

const getLastestBlock = () : Block => {
    return blockchain[blockchain.length - 1];
}

const calculateHash = (index : number, previousHash : string, 
    timestamp : number, data : Transaction[], difficulty: number, nonce: number) : string => {
        return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString()
}

const calculateHashForBlock = (block : Block) : string => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
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
    }else if(!isValidTimestamp(newBlock, previousBlock)){
        console.log("invalid timestamp")
        return false;
    }
    return true;
}

const isValidTimestamp = (newBlock : Block, previousBlock : Block): boolean => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp) &&
    (newBlock.timestamp - 60 < getCurrentTimestamp())

}

const getCurrentTimestamp = ():number => Math.round(new Date().getTime()/1000);


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
    if(isValidChain(newBlocks) && 
    getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(blockchain)){
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcastLatest();
    } else {
        console.log('Received blockchain invalid');
    }
}

const getAccumulatedDifficulty = (aBlockchain : Block[]): number => {
    return aBlockchain
    .map((block) => block.difficulty )
    .map( (difficulty) => Math.pow(2, difficulty) )
    .reduce((a,b) => a + b);
}

const getBlockchain = () : Block[] => blockchain;

let blockchain : Block[] = [genesisBlock];

export{
    getLastestBlock, Block, isValidBlockStructure, 
    isValidNewBlock, addBlockToBlockchain, replaceChain,
    getBlockchain, generateNextBlock, getAccountBalance, generatenextBlockWithTransaction
}