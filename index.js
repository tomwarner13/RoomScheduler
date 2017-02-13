const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;

const uuidV4 = require('uuid/v4');

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

const illegalEventWarn = "Event cannot have an end time equal or prior to the start time!";

function isIllegalEvent(event) {
    return event.start >= event.end;
}

function checkEvent(newEvent, events) {
  if(isIllegalEvent(newEvent)) {
    return new EventResult(false, illegalEventWarn);
  }

  for(var i in events) {
    var event = events[i];

    if(event.end > newEvent.start) {
      if(event.start >= newEvent.end) {
        newEvent._id = newEvent._id || uuidV4(); //generate ID only if new event
        events.splice(i, 0, newEvent);
        return new EventResult(true);
      }
      return new EventResult(false, "Conflicts with another event!", event);
    }
  }

  newEvent._id = newEvent._id || uuidV4();
  events.push(newEvent);
  return new EventResult(true);
}

function modifyEvent(updatedEvent, events) {    
  if(isIllegalEvent(updatedEvent)) {
    return new EventResult(false, illegalEventWarn);
  }

  for(var i in events) {
    var event = events[i];

    if(event._id === updatedEvent._id) {
        if(updatedEvent.start === undefined && updatedEvent.end === undefined) {
            event.description = updatedEvent.description || "";
            return new EventResult(true);
        }

        //if only start time is modified, check if it conflicts with the immediate previous event
        if(updatedEvent.end === undefined) {
            if(!events[i - 1] || events[i - 1].end <= updatedEvent.start) {
                event.start = updatedEvent.start;
                if(isIllegalEvent(event)) return new EventResult(false, illegalEventWarn);
                event.description = updatedEvent.description || "";
                return new EventResult(true);
            }
        }

        //if only end time is modified, check if it conflicts with the immediate next event
        if(updatedEvent.start === undefined) {
            if(!events[i + 1] || events[i + 1].start >= updatedEvent.end) {
                event.end = updatedEvent.end;
                if(isIllegalEvent(event)) return new EventResult(false, illegalEventWarn);
                event.description = updatedEvent.description || "";
                return new EventResult(true);
            }
        }

        //if both start and end have changed, we need to remove it and treat it as added, since we don't know where it belongs in the order anymore
        updatedEvent.description = updatedEvent.description || event.description;
        events.splice(i, 1);
        return checkEvent(updatedEvent, events);
    }
  }

  return new EventResult(false, "Event not found!");
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
.

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

app.put('/api/rooms/:name/events/:eventId', (req, res) => {
    MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.findOne({ name: req.params.name }, function(err, room) {
        assert.equal(null, err);

        if(room === null) {
            res.status(404).send(`Room ${req.params.name} not found!`);
            return;
        }

        var event = req.body;
        event._id = req.params.eventId;
        var result = modifyEvent(event, room.events);
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

app.delete('/api/rooms/:name/events/:eventId', (req, res) => {
    MongoClient.connect(dbUrl, function(err, db) {
    assert.equal(null, err);

    var rooms = db.collection('rooms');

    rooms.findOne({ name: req.params.name }, function(err, room) {
        assert.equal(null, err);

        if(room === null) {
            res.status(404).send(`Room ${req.params.name} not found!`);
            return;
        }

        for(let i in room.events) {
            var event = room.events[i];

            if(event._id === req.params.eventId) {
                room.events.splice(i, 1);
                rooms.updateOne({ _id: room._id }, { $set: { events: room.events }}, (err, updateResult) => {
                    assert.equal(null, err);

                    res.send("event deleted!");
                });
                return;
            }
        }
        res.status(404).send("Event not found!");
    });
  });
})

app.listen(3000, function () {
  console.log('Room scheduler listening on port 3000!');
})