var express = require('express'),
    MongoClient = require('mongodb').MongoClient;
var router = express.Router();

/* GET users listing. */
router.get('/:connID', function(req, res) {
  console.log(req.params.connID);
  var connectionID = req.params.connID;

  MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
    console.log('Opened connection to database, reading');
    db.collection('connections').find({ 'CourseName': { $regex: connectionID } }).toArray(function callback(err, data) {
      console.log(data);
      res.send(data);
    });
  });
});

module.exports = router;
