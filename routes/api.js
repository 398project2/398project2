var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/:route', function(req, res) {
  console.log(req.params.route);


  res.send(req.params.route);
});

module.exports = router;
