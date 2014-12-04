var express = require('express'),
    MongoClient = require('mongodb').MongoClient;
var router = express.Router();

/* GET users listing. */
router.route('/:id').get(function(req, res) {
    var courseID = req.params.id;

   /**/ MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      db.collection('connections').find({ '_id': courseID  }).toArray(function callback(err, data) {
        if (err) { console.log(err); res.send(err.message); }
        else { res.send(data); }
      });
    });
  })
  .delete(function(req, res) {
    var courseID = req.params.id;

    /**/ MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      db.collection('connections').remove({ '_id': courseID  }, function callback(err) {
        if (err) { console.log(err); res.send(err.message); }
        else { res.send('success'); }
      });
    });
  })
  .put(function(req, res) {
    var courseID = req.params.id;

    /**/ MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      db.collection('connections').save(req.body, function callback(err) {
        if (err) { console.log(err); res.send(err.message); }
        else { res.send('success'); }
      });
    });
  });

module.exports = router;
