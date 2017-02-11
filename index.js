const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
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

app.listen(3000, function () {
  console.log('Room scheduler listening on port 3000!');
})