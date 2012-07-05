/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  conf = require('./configuration/conf'),
  mongoose = require('mongoose'),
  db;

var app = module.exports = express.createServer();

/**
 *  SCHEMAS
 */

var BookmarkSchema = new mongoose.Schema({
    url: String
  , tags: String

});

/**
 *  MODELS DEFINITION AND CONNECT TO DB
 */

// Map Schema to Model
var Bookmark = mongoose.model('Bookmark', BookmarkSchema);

// Connect
db = mongoose.connect('mongodb://localhost/bookmark-manager');

// db = mongoose.connect(process.env.MONGOLAB_URI);

/**
 *  CONFIGURATIONS
 */

// Configuration
app.configure(function() {
  app.use(express.bodyParser());
  app.use(express.static(__dirname + "/public"));
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  // app.use(app.router);
  app.use(express.session({
    secret: "secret"
  }));
  app.set('view engine', 'jade');
});

// Development
app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// Production
app.configure('production', function() {
  app.use(express.errorHandler());
});

/**
 *  ROUTES
 */

// Home
app.get('/', routes.home);

// Bookmark API

// Get all bookmarks
app.get('/api/bookmarks', function(req, res) {
  return Bookmark.find(function(err, bookmarks) {
    if (!err) {
      return res.send(bookmarks);
    }
    else {
      return console.log(err);
    }

  });
});

// Get bookmark by id
app.get('/api/bookmarks/:id', function(req, res) {
  return Bookmark.findById(req.params.id, function(err, bookmark) {
    if (!err) {
      return res.send(bookmark);
    }
    else {
      return console.log(err);
    }
  });
});

// Update bookmark
app.put('/api/bookmarks/:id', function(req, res) {
  return Bookmark.findById(req.params.id, function(err, bookmark) {
    bookmark.url = req.body.url;
    bookmark.tags = req.body.tags;
    return bookmark.save(function(err) {
      if (!err) {
        console.log("updated");
      }
      else {
        console.log(err);
      }
      return res.send(bookmark);
    });
  });
});

// Create new bookmark
app.post('/api/bookmarks', function(req, res) {
  var bookmark;
  bookmark = new Bookmark({
    url: req.body.url,
    tags: req.body.tags
  });
  bookmark.save(function(err) {
    if (!err) {
      return console.log("created");
    }
    else {
      return console.log(err);
    }
  });
  return res.send(bookmark);
});

// Delete bookmark
app.delete('/api/bookmarks/:id', function(req, res) {
  return Bookmark.findById(req.params.id, function(err, bookmark) {
    return bookmark.remove(function(err) {
      if (!err) {
        console.log("removed");
        return res.send('')
      }
      else {
        return console.log(err);
      }
    });
  });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});



