var express = require('express'),
	MongoClient = require('mongodb').MongoClient;
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  // res.send('respond with a resource');

  var userID = req.params.id;

    MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      res.send('connected');
      db.collection('user-info').find(/*computer id*/req.body, function callback(err) {
        if (err) { console.log(err); res.send(err.message); }
        else { res.send('success'); }
      });
    });
})
.put(function(req, res) {
    var userID = req.params.id;

    MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      db.collection('user-info').save(/*computer id*/req.body, function callback(err) {
        if (err) { console.log(err); res.send(err.message); }
        else { res.send('success'); }
      });
    });
});

module.exports = router;