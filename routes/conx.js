var express = require('express'),
    fs = require('fs'),
    MongoClient = require('mongodb').MongoClient;
var router = express.Router();

router.route('/')

  .get(function(req, res) {
    var allCourses = JSON.parse(fs.readFileSync('data/crs.json'));
    var allConnections = JSON.parse(fs.readFileSync('data/conxs.json'));
    console.log(allConnections);
    res.render('index', { title: 'Connections', allCourses: allCourses, allConnections: allConnections });
  })

  .post(function(req, res) {
    var submittedCourses = [];
    var submittedConnections = [];
    var conxCourses = [];

    if (req.body.conx != '') {

    }
    else {
      var i = 0;
      while (req.body['' + i] != null) {
        submittedCourses.push(req.body['' + i]);
        i++;
      }

      var courseConx = JSON.parse(fs.readFileSync('data/scraping/course_conx.json'));

      var conxCode;

      for (i in submittedCourses) {
        conxCode = submittedCourses[i];
        conxCourses.push.apply(conxCourses, courseConx[conxCode]);
      }
    }
    
    res.render('result', { title: 'Thanks!', courses: conxCourses });
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
