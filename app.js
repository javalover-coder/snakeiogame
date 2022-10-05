
// Use ES6
"use strict";

var port = process.env.PORT || 1337;
var x = 1;
console.log(x);
// Express & Socket.io deps
var express = require('express');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('lodash');
var bodyParser = require('body-parser');

const Snake = require('./snake');
const Apple = require('./apple');


//Connect to the database
var mysql = require('mysql2');
/*
const { Console } = require('console');


var conn = mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: 'iamnotarobot',
    database: 'snakeIODatabase'

})*/
var conn = mysql.createConnection({
    host: 'us-cdbr-east-06.cleardb.net',
    user: "bbd3926a1b4ae8",
    password: 'ea809468',
    database: 'heroku_de1070a1b06b3c7'
})

conn.connect(function(err) {
    if(err) throw err;

    var sql = "CREATE TABLE IF NOT EXISTS snakegame (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), password VARCHAR(255), highestScore INT)";

    conn.query(sql, function(err, result) { 
        if (err) throw err;
        console.log("Table Created");
    })
})

// ID's seed
let autoId = 0;
// Grid size
const GRID_SIZE = 40;
// Remote players 
let players = [];
// Apples 
let apples = [];


app.use(express.static("public"));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

app.use(bodyParser.urlencoded({ extended: true }));
//form-urlencoded

app.get('/', function (req, res) {
    res.render('index.html', {error: ''});
});

app.post('/game', function (req, res) {
    var name = req.body.nickname;
    var sql = "SELECT name FROM snakegame WHERE name = ?";
    conn.query(sql, [name], function(err,result) {
        if (err) throw err;
        if (result.length > 0) {
            res.render('index.html', {error: "This name is not avalable"});
            
        } else {
            res.render('game.html', { Nickname: name});
        }
    })
});
    

// Creates /login route
app.get('/login', function (req, res) {
    res.render('login.html', { error: '' });
});

// Submits login
app.post('/login', function (req, res) {
    var name = req.body.username;
    var password = req.body.password;
    var sql = "SELECT name, highestScore FROM snakegame WHERE name = ? AND password = ?";
    conn.query(sql, [name,password], function(err, result) {
        if (err) throw err;
        if (result.length > 0) {
            var highestScore = result[0].highestScore;
            res.render('game.html', { Nickname: result[0].name});
        } else {
            res.render("login.html", {error: "Wrong username or password"});
        }
    });
});
//Creates /signup route
app.get('/signup', function (req, res) {
    res.render('signup.html', { error: '' });
});
//Submits signup
app.post('/signup', function (req, res) {
    var name = req.body.username;
    var password = req.body.password;
    var sql = "SELECT name FROM snakegame WHERE name = ?";
    conn.query(sql, [name], function(err, result) {
        if (err) throw err;
        if (result.length > 0) {
            res.render("signup.html", {error: "Username already exists"});
        } else {
            var sql = "INSERT INTO snakegame(name, password, highestScore) VALUES ?";
            var highestScore = 0;
            var values = [[name,password,highestScore]];
            
            conn.query(sql, [values], function(err, result) {
                if (err) throw err;
                console.log("Number of records inserted:" + result.affectedRows);
            });
            res.render('game.html', { Nickname: name, highestScore: highestScore });
        }
    });
});


http.listen(port, () => {
    console.log('listening on *:' + port);
});

/*
 * Listen for incoming clients
 */
io.on('connection', (client) => {
    let player;
    let id;
    let color;

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var get_color = '#';
        for (var i = 0; i < 6; i++) {
            get_color += letters[Math.floor(Math.random() * 16)];
        }
        return get_color;
    }

    client.on('auth', (opts, cb) => {
        // Create player
        id = ++autoId;
        color = getRandomColor();
        player = new Snake(_.assign({
            id, color,
            dir: 'right',
            gridSize: GRID_SIZE,
            snakes: players,
            apples
        }, opts));
        players.push(player);
        // Callback with id
        cb({ id: autoId });
    });

    // Receive keystrokes
    client.on('key', (key) => {
        // and change direction accordingly
        if (player) {
            player.changeDirection(key);
        }
    });

    // Remove players on disconnect
    client.on('disconnect', () => {
        var points = player.points;
        var nickname = player.nickname;
        var sql = "SELECT highestScore FROM snakegame WHERE name = ?";
        conn.query(sql,[nickname], function(err,result) {
            if(err) throw err;
            if(result.length != 0) {
                var highestScore = result[1];
                if(highestScore < points) {
                    var sql = "UPDATE snakegame SET highestScore = ? WHERE name = ?";
                    conn.query(sql, [points,nickname], function(err,result) {
                        if(err) throw err;
                        if (result.length = 0) {

                        }
                    })
                }
            }
        })
        _.remove(players, player);

    });
});




// Create apples
for (var i = 0; i < 3; i++) {
    apples.push(new Apple({
        gridSize: GRID_SIZE,
        snakes: players,
        apples
    }));
}

// Main loop
setInterval(() => {
    players.forEach((p) => {
        p.move();
    });
    io.emit('state', {
        players: players.map((p) => ({
            x: p.x,
            y: p.y,
            id: p.id,
            color: p.color,
            nickname: p.nickname,
            points: p.points,
            tail: p.tail
        })),
        apples: apples.map((a) => ({
            x: a.x,
            y: a.y
        }))
    });
}, 100);