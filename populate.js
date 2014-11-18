var fs          = require('fs'),
    MongoClient = require('mongodb').MongoClient;

function readFile(fileName) {
    console.log('Reading ' + fileName);
    return new Promise(function promiseRead(resolve, reject) {
        fs.readFile(fileName, function handleReadResponse(err, data) {
            if (err) { reject(Error(err)); }
            else { resolve(data); }
        });
    });
}

function resetDatabase() {
    console.log('Resetting database');
    return new Promise(function wipeDB(resolve, reject) {
        MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
            db.collection('connections').remove({}, function handleWipeResponse(err) {
                if (err) { reject(); }
                else { resolve(); }
            });
        });
    });
}

function preprocessJSON(cardJsonData) {
    console.log('Preprocessing data');
    // return Object.keys(cardJsonData).map(function eachCard(entry, i, array) {
    //     return cardJsonData[entry];
    // });
    return cardJsonData.ConnectionDescriptions;
}

function loadJSON() {
    return readFile('connections.json').then(JSON.parse).then(preprocessJSON);
}

function saveToDatabase(cardJsonData) {
    console.log('Read data, saving to database');
    return new Promise(function promiseSave(resolve, reject) {
        MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
            console.log('Opened connection to database, inserting');
            db.collection('connections').insert(cardJsonData, function handleWipeResponse(err) {
                if (err) { reject(Error(err)); }
                else { resolve(); }
            });
        });
    }).catch(function handlePromiseError(err) {
        console.error(err.stack);
        throw err;
    });
}

function runEverything() {
    resetDatabase()
        .then(loadJSON)
        .then(saveToDatabase)
        .then(function manuallyExit() {
            console.log('Done');
            process.exit(0);
        })
        .catch(function handlePromiseError(err) {
            console.error(err.stack);
            throw err;
        });
}

runEverything();