const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const assert = require('assert');

const bodyParser = require('body-parser');

const dbUrl = 'mongodb://localhost:12345/rooms';

const defaultRooms = [
    {
        name: "Red Room",
        events: []
    },
    {
        name: "Orange Room",
        events: []
    },
    {
        name: "Yellow Room",
        events: []
    }
]

function initRooms(db, callback) {
    var rooms = db.collection('rooms');


    rooms.insertMany(defaultRooms), function(err, result) {
        assert.equal(err, null);
        console.log("inserted room list into db!");
        callback(result);
    }
}

function clearRooms(db, callback) {
    var rooms = db.collection('rooms');

    rooms.remove({});
    callback();
}

function checkEvent(newEvent, events) {
  if(newEvent.start >= newEvent.end) {
    return false; //cannot have zero or negative-length event
  }

  for(var i in events) {
    var event = events[i];

    if(event.end > newEvent.start) {
      if(event.start >= newEvent.end) {
        events.splice(i, 0, newEvent);
        return true;
      }
      return false;
    }
  }

  events.push(newEvent);
  return true;
}


app.get('/api/rooms', (req, res) =>
{
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.find({}).toArray(function(err, docs) {
      assert.equal(err, null);
      res.json(docs);
    })
  });
})

app.get('/api/rooms/:id', (req, res) =>
{
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.findOne({ _id: new ObjectId(req.params.id) }, function(err, doc) {
        assert.equal(null, err);
        res.json(doc);
    });
  });
})

app.get('/api/rooms/name/:name', (req, res) =>
{
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.findOne({ name: req.params.name }, function(err, doc) {
        assert.equal(null, err);
        res.json(doc);
    });
  });
})

app.post('/api/rooms/init', (req, res) => {
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    clearRooms(db, () => console.log("rooms cleared"));
    initRooms(db, () => db.close());
  });
  res.send("ok");
})

app.post('/api/rooms/clear', (req, res) => {
  MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);
    clearRooms(db, () => db.close());
  });
  res.send("cleared");
})

//stubbing out rest of API for now so there's something to develop against

app.post('/api/rooms/:name/events', (req, res) => {
    //add event
})

app.put('api/rooms/:name/events/:eventId', (req, res) => {
    //modify event
})

app.delete('api/rooms/:name/events/:eventId', (req, res) => {
    //delete event
})

app.listen(3000, function () {
  console.log('Room scheduler listening on port 3000!');
})