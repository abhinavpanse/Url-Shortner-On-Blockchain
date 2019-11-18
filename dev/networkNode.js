const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Blockchain = require("./blockchain");
const uuid = require("uuid/v1");
const port = process.argv[2];
const rp = require("request-promise");
const shortid = require("shortid");

const nodeAddress = uuid()
  .split("-")
  .join("");

const tinybcurl = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// get entire blockchain
app.get("/blockchain", function(req, res) {
  res.send(tinybcurl);
});

// create a new transaction
app.post("/transaction", function(req, res) {
  const newTransaction = req.body;
  const blockIndex = tinybcurl.addTransactionToPendingTransactions(
    newTransaction
  );
  res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

// broadcast transaction
app.post("/transaction/broadcast", function(req, res) {
  const shortUrl = "http://localhost:5000/" + shortid();

  const newTransaction = tinybcurl.createNewTransaction(
    shortUrl,
    req.body.longUrl
  );
  tinybcurl.addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  tinybcurl.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + "/transaction",
      method: "POST",
      body: newTransaction,
      json: true
    };

    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises).then(data => {
    res.json({
      note: "Transaction created and broadcast successfully.",
      newTransaction
    });
  });
});

// mine a block
app.get("/mine", function(req, res) {
  const lastBlock = tinybcurl.getLastBlock();
  const previousBlockHash = lastBlock["hash"];
  const currentBlockData = {
    transactions: tinybcurl.pendingTransactions,
    index: lastBlock["index"] + 1
  };
  const nonce = tinybcurl.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = tinybcurl.hashBlock(
    previousBlockHash,
    currentBlockData,
    nonce
  );
  const newBlock = tinybcurl.createNewBlock(
    nonce,
    previousBlockHash,
    blockHash
  );

  const requestPromises = [];
  tinybcurl.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + "/receive-new-block",
      method: "POST",
      body: { newBlock: newBlock },
      json: true
    };

    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises).then(data => {
    res.json({
      note: "New block mined & broadcast successfully",
      block: newBlock
    });
  });
});

// receive new block
app.post("/receive-new-block", function(req, res) {
  const newBlock = req.body.newBlock;
  const lastBlock = tinybcurl.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock["index"] + 1 === newBlock["index"];

  if (correctHash && correctIndex) {
    tinybcurl.chain.push(newBlock);
    tinybcurl.pendingTransactions = [];
    res.json({
      note: "New block received and accepted.",
      newBlock: newBlock
    });
  } else {
    res.json({
      note: "New block rejected.",
      newBlock: newBlock
    });
  }
});

// register a node and broadcast it the network
app.post("/register-and-broadcast-node", function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  if (tinybcurl.networkNodes.indexOf(newNodeUrl) == -1)
    tinybcurl.networkNodes.push(newNodeUrl);

  const regNodesPromises = [];
  tinybcurl.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + "/register-node",
      method: "POST",
      body: { newNodeUrl: newNodeUrl },
      json: true
    };

    regNodesPromises.push(rp(requestOptions));
  });

  Promise.all(regNodesPromises)
    .then(data => {
      const bulkRegisterOptions = {
        uri: newNodeUrl + "/register-nodes-bulk",
        method: "POST",
        body: {
          allNetworkNodes: [...tinybcurl.networkNodes, tinybcurl.currentNodeUrl]
        },
        json: true
      };

      return rp(bulkRegisterOptions);
    })
    .then(data => {
      res.json({ note: "New node registered with network successfully." });
    });
});

// register a node with the network
app.post("/register-node", function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  const nodeNotAlreadyPresent =
    tinybcurl.networkNodes.indexOf(newNodeUrl) == -1;
  const notCurrentNode = tinybcurl.currentNodeUrl !== newNodeUrl;
  if (nodeNotAlreadyPresent && notCurrentNode)
    tinybcurl.networkNodes.push(newNodeUrl);
  res.json({ note: "New node registered successfully." });
});

// register multiple nodes at once
app.post("/register-nodes-bulk", function(req, res) {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach(networkNodeUrl => {
    const nodeNotAlreadyPresent =
      tinybcurl.networkNodes.indexOf(networkNodeUrl) == -1;
    const notCurrentNode = tinybcurl.currentNodeUrl !== networkNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode)
      tinybcurl.networkNodes.push(networkNodeUrl);
  });

  res.json({ note: "Bulk registration successful." });
});

// consensus
app.get("/consensus", function(req, res) {
  const requestPromises = [];
  tinybcurl.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + "/blockchain",
      method: "GET",
      json: true
    };

    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises).then(blockchains => {
    const currentChainLength = tinybcurl.chain.length;
    let maxChainLength = currentChainLength;
    let newLongestChain = null;
    let newPendingTransactions = null;

    blockchains.forEach(blockchain => {
      if (blockchain.chain.length > maxChainLength) {
        maxChainLength = blockchain.chain.length;
        newLongestChain = blockchain.chain;
        newPendingTransactions = blockchain.pendingTransactions;
      }
    });

    if (
      !newLongestChain ||
      (newLongestChain && !tinybcurl.chainIsValid(newLongestChain))
    ) {
      res.json({
        note: "Current chain has not been replaced.",
        chain: tinybcurl.chain
      });
    } else {
      tinybcurl.chain = newLongestChain;
      tinybcurl.pendingTransactions = newPendingTransactions;
      res.json({
        note: "This chain has been replaced.",
        chain: tinybcurl.chain
      });
    }
  });
});

// get block by blockHash
app.get("/block/:blockHash", function(req, res) {
  const blockHash = req.params.blockHash;
  const correctBlock = tinybcurl.getBlock(blockHash);
  res.json({
    block: correctBlock
  });
});

// get transaction by transactionId
app.get("/transaction/:transactionId", function(req, res) {
  const transactionId = req.params.transactionId;
  const trasactionData = tinybcurl.getTransaction(transactionId);
  res.json({
    transaction: trasactionData.transaction,
    block: trasactionData.block
  });
});

// get address by address /?address=<address>
app.get("/address", function(req, res) {
  const address = req.query.address;
  const addressData = tinybcurl.getAddressData(address);
  // res.json({
  //   addressData: addressData
  // });
  // console.log(addressData);
  // res.redirect(addressData.longUrl);
  res.send(addressData);
});

// block explorer
app.get("/block-explorer", function(req, res) {
  res.sendFile("./block-explorer/index.html", { root: __dirname });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}...`);
});
