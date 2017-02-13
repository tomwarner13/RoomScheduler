const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;

const assert = require('assert');

const bodyParser = require('body-parser');
app.use(bodyParser.json());

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

class EventResult {
    constructor(success, message, conflictingEvent) {
        if(success) {
            this.message = "Success";
        } else {
            this.message = message;
        }
        this.success = success;
        this.conflictingEvent = conflictingEvent || {};
    }
}

function checkEvent(newEvent, events) {
  if(newEvent.start >= newEvent.end) {
    return new EventResult(false, "Event cannot have an end time equal or prior to the start time!");
  }

  for(var i in events) {
    var event = events[i];

    if(event.end > newEvent.start) {
      if(event.start >= newEvent.end) {
        events.splice(i, 0, newEvent);
        return new EventResult(true);
      }
      return new EventResult(false, "Conflicts with another event!", event);
    }
  }

  events.push(newEvent);
  return new EventResult(true);
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
    MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.findOne({ name: req.params.name }, function(err, room) {
        assert.equal(null, err);

        if(room === null) {
            res.status(404).send(`Room ${req.params.name} not found!`);
            return;
        }

        var result = checkEvent(req.body, room.events);
        if(result.success) {
            rooms.updateOne({ _id: room._id }, { $set: { events: room.events }}, (err, updateResult) => {
                assert.equal(null, err);

                res.send(result.message);
            });
        }
        else
        {
            res.status(422).send(result.message);
        }
    });
  });
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