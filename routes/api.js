var express = require('express'),
    MongoClient = require('mongodb').MongoClient;
var router = express.Router();

/* GET users listing. */
router.route('/:connID').get(function(req, res) {
  var connectionID = req.params.connID;
  var connectionIDMatcher = new RegExp(connectionID);

  MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
    db.collection('connections').find({ '_id': connectionID  }).toArray(function callback(err, data) {
      res.send(data);
    });
  });
}).delete(function(req, res) {
  var connectionID = req.params.connID;
  var connectionIDMatcher = new RegExp(connectionID);

  MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
    db.collection('connections').remove({ '_id': connectionID  }, function callback(err) {
      if (!err) {
      	res.send('deleted');
      }
      else {
      	console.log(err);
      	res.send('problem');
      }
    });
  });
}).put(function(req, res) {
  var connectionID = req.params.connID;
  var connectionIDMatcher = new RegExp(connectionID);
  

  MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
    db.collection('connections').save(req.body, function callback(err) {
      if (!err) {
      	res.send('saved');
      }
      else {
      	console.log(err);
      	res.send('problem');
      }
    });
  });
});

module.exports = router;
