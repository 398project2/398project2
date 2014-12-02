var express = require('express'),
    MongoClient = require('mongodb').MongoClient;
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', { title: 'Connections' });
});

router
  // Middleware to load database for all following method routes
  .use(function(req, res, next) {
    MongoClient.connect('mongodb://mega-group:398project2@ds053320.mongolab.com:53320/398project2', function handleResponse(err, db) {
      req.dbCollection = db.collection('connections');
      next();
    });
  })
  .route('/api/:id')
  // GET
  .get(function(req, res) {
    var connectionID = req.params.id;

    req.dbCollection.find({ '_id': connectionID  }).toArray(function callback(err, data) {
      if (err) { console.log(err); res.send(err.message); }
      else { res.send(data); }
    });
  })
  // DELETE
  .delete(function(req, res) {
    var connectionID = req.params.id;

    req.dbCollection.remove({ '_id': connectionID  }, function callback(err) {
      if (err) { console.log(err); res.send(err.message); }
      else { res.send('success'); }
    });
  })
  // PUT
  .put(function(req, res) {
    var connectionID = req.params.id;

    req.dbCollection.save(req.body, function callback(err) {
      if (err) { console.log(err); res.send(err.message); }
      else { res.send('success'); }
    });
  });

module.exports = router;
