"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const CryptoJS = __importStar(require("crypto-js"));
const p2p_1 = require("./p2p");
const utils_1 = require("./utils");
class Block {
    /*
    public index : number;
    public hash : string;
    public previousHash : string;
    public timestamp: number;
    public data : string;
    */
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}
exports.Block = Block;
const genesisBlock = new Block(0, '98afd75b978eb70696d9bbbb99211efa535208c8520b62331a2d007571c3b072', '', 1465154705, "my first block", 0, 0);
const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;
const getDifficulty = (aBlockchain) => {
    const latestBlock = aBlockchain[aBlockchain.length - 1];
    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(aBlockchain);
    }
    else {
        return aBlockchain[aBlockchain.length - 1].difficulty;
    }
};
const getAdjustedDifficulty = (aBlockchain) => {
    const previousAdjustedBlock = aBlockchain[aBlockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const latestBlock = aBlockchain[aBlockchain.length - 1];
    const expectedTime = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const actualTimeTaken = latestBlock.timestamp - previousAdjustedBlock.timestamp;
    console.log('actualTimeTaken ' + actualTimeTaken);
    if (actualTimeTaken < (expectedTime / 2)) {
        return previousAdjustedBlock.difficulty + 1;
    }
    else if (actualTimeTaken > (expectedTime / 2)) {
        let d = previousAdjustedBlock.difficulty - 1;
        if (d < 0) {
            return 0;
        }
        else {
            return d;
        }
    }
    else {
        previousAdjustedBlock.difficulty;
    }
};
const generateNextBlock = (data) => {
    const previousBlock = getLastestBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = getCurrentTimestamp();
    const difficulty = getDifficulty(getBlockchain());
    const block = findBlock(nextIndex, previousBlock.hash, nextTimestamp, data, difficulty);
    if (addBlockToBlockchain(block)) {
        p2p_1.broadcastLatest();
    }
    return block;
};
exports.generateNextBlock = generateNextBlock;
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        //console.log('checking nonce ' , nonce)
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = utils_1.hexToBinary(hash);
    //console.log('hashInBinary ', hashInBinary)
    //console.log('difficulty ' , difficulty)
    const requiredPrefix = '0'.repeat(difficulty);
    //console.log('required prefix is ' +  requiredPrefix + ' ;')
    //console.log('is statisfiled ', hashInBinary.startsWith(requiredPrefix))
    return hashInBinary.startsWith(requiredPrefix);
};
const addBlockToBlockchain = (block) => {
    if (isValidNewBlock(block, getLastestBlock())) {
        blockchain.push(block);
        return true;
    }
    return false;
};
exports.addBlockToBlockchain = addBlockToBlockchain;
const getLastestBlock = () => {
    return blockchain[blockchain.length - 1];
};
exports.getLastestBlock = getLastestBlock;
const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
};
const calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
};
const isValidNewBlock = (newBlock, previousBlock) => {
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    }
    else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    }
    else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log("invalid timestamp");
        return false;
    }
    return true;
};
exports.isValidNewBlock = isValidNewBlock;
const isValidTimestamp = (newBlock, previousBlock) => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp) &&
        (newBlock.timestamp - 60 < getCurrentTimestamp());
};
const getCurrentTimestamp = () => Math.round(new Date().getTime() / 1000);
const isValidBlockStructure = (block) => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'string';
};
exports.isValidBlockStructure = isValidBlockStructure;
const isValidChain = (blockchainToValidate) => {
    const isValidGenesis = (block) => {
        return JSON.stringify(genesisBlock) === JSON.stringify(block);
    };
    if (!isValidGenesis(blockchainToValidate[0])) {
        return false;
    }
    for (let i = 1; i < blockchainToValidate.length; i++) {
        if (!isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1]))
            return false;
    }
    return true;
};
const replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(blockchain)) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        p2p_1.broadcastLatest();
    }
    else {
        console.log('Received blockchain invalid');
    }
};
exports.replaceChain = replaceChain;
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
};
const getBlockchain = () => blockchain;
exports.getBlockchain = getBlockchain;
let blockchain = [genesisBlock];
