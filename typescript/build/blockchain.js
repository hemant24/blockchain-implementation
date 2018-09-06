"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var CryptoJS = __importStar(require("crypto-js"));
var p2p_1 = require("./p2p");
var Block = /** @class */ (function () {
    /*
    public index : number;
    public hash : string;
    public previousHash : string;
    public timestamp: number;
    public data : string;
    */
    function Block(index, hash, previousHash, timestamp, data) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
    }
    return Block;
}());
exports.Block = Block;
var genesisBlock = new Block(0, '98afd75b978eb70696d9bbbb99211efa535208c8520b62331a2d007571c3b072', '', 1465154705, "my first block");
var generateNextBlock = function (data) {
    var previousBlock = getLastestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, data);
    var block = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, data);
    if (addBlockToBlockchain(block)) {
        p2p_1.broadcastLatest();
    }
    return block;
};
exports.generateNextBlock = generateNextBlock;
var addBlockToBlockchain = function (block) {
    if (isValidNewBlock(block, getLastestBlock())) {
        blockchain.push(block);
        return true;
    }
    return false;
};
exports.addBlockToBlockchain = addBlockToBlockchain;
var getLastestBlock = function () {
    return blockchain[blockchain.length - 1];
};
exports.getLastestBlock = getLastestBlock;
var calculateHash = function (index, previousHash, timestamp, data) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};
var calculateHashForBlock = function (block) {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
};
var isValidNewBlock = function (newBlock, previousBlock) {
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
    return true;
};
exports.isValidNewBlock = isValidNewBlock;
var isValidBlockStructure = function (block) {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'string';
};
exports.isValidBlockStructure = isValidBlockStructure;
var isValidChain = function (blockchainToValidate) {
    var isValidGenesis = function (block) {
        return JSON.stringify(genesisBlock) === JSON.stringify(block);
    };
    if (!isValidGenesis(blockchainToValidate[0])) {
        return false;
    }
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (!isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1]))
            return false;
    }
    return true;
};
var replaceChain = function (newBlocks) {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        //broadcastLatest();
    }
    else {
        console.log('Received blockchain invalid');
    }
};
exports.replaceChain = replaceChain;
var getBlockchain = function () { return blockchain; };
exports.getBlockchain = getBlockchain;
var blockchain = [genesisBlock];
