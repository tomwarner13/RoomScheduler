var express = require('express')
var app = express()

const rooms = [
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

app.get('/api/rooms', (req, res) =>
{
    res.json(rooms);
})

app.listen(3000, function () {
  console.log('Room scheduler listening on port 3000!')
})