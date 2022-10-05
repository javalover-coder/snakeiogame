 // Use ES6
"use strict";

const _ = require('lodash');
var mysql = require('mysql2');
/*
var conn = mysql.createConnection({
  host: "localhost",
  user: 'root',
  password: 'iamnotarobot',
  database: 'snakeIODatabase'

})
*/
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

// Key maps
const KEYS = {
  up: 38,
  right: 39,
  down: 40,
  left: 37
};

/*
 * Snake class
 */
class Snake {
  constructor(options) {
    _.assign(this, options);
    this.respawn();
  }

  changeDirection(key) {
    switch (key) {
      case KEYS.up:
        if (this.dir !== 'down')
          this.dir = 'up'; break;
      case KEYS.right:
        if (this.dir !== 'left')
          this.dir = 'right'; break;
      case KEYS.down:
        if (this.dir !== 'up')
          this.dir = 'down'; break;
      case KEYS.left:
        if (this.dir !== 'right')
          this.dir = 'left'; break;
    }
  }

  move() {
    // Update tail
    for(var i = this.tail.length-1; i >= 0; i--) {
      this.tail[i].x = (i===0) ? this.x : this.tail[i-1].x;
      this.tail[i].y = (i===0) ? this.y : this.tail[i-1].y;
    }

    // Move head
    switch(this.dir) {
      case 'right':
        this.x++; break;
      case 'left':
        this.x--; break;
      case 'up':
        this.y--; break;
      case 'down':
        this.y++; break;
    }

    // Check boundaries
    if(this.x > this.gridSize-1) this.x = 0;
    if(this.x < 0) this.x = this.gridSize-1;
    if(this.y > this.gridSize-1) this.y = 0;
    if(this.y < 0) this.y = this.gridSize-1;

    // Collission detection
    this._checkCollisions();
  }

  _checkCollisions() {
    // With other snakes (including ours)
    this.snakes.forEach((s) => {
      // Heads except ourself
      if(s !== this) {
        if(s.x === this.x && s.y === this.y) {
          // The bigger survives
          // ToDo: 3 outcomes
          // - Same length = both die
          if(s !== this && this.tail.length < s.tail.length) {
            this.respawn();
          } else {
            s.respawn();
          }
        }
      }
      // Tails
      s.tail.forEach((t) => {
        if(t.x === this.x && t.y === this.y) {
          // The bigger survives
          // ToDo: 3 outcomes
          // - Same length = both die
          if(s !== this && this.tail.length < s.tail.length) {
            this.respawn();
          } else {
            s.respawn();
          }
        }
      });
    });
    // With apples
    this.apples.forEach((a) => {
      if(a.x === this.x && a.y === this.y) {
        this._addPoint(1);
        this._addTail();
        a.respawn();
      }
    });
  }

  respawn() {
    var sql = 'SELECT highestScore FROM snakegame WHERE name = ?';
    var points = this.points;
    var nickname = this.nickname;
    
    conn.query(sql, [this.nickname], function(err, result) {
      if (err) throw err;
      if (result.length > 0) {
        if (points > result[0]["highestScore"]) {
        sessionStorage.setItem("bestScore",result[0]["highestScore"]);
        var sql = "UPDATE snakegame SET highestScore = ? WHERE name = ?";
        conn.query(sql, [points, nickname], function(err, result) {
            if(err) throw err;
        })
      }
      } else {
        sessionStorage.setItem("bestScore", 0);
      }
    })
    this.tail = [];
    this.points = 0;
    this.x = Math.random() * this.gridSize | 0;
    this.y = Math.random() * this.gridSize | 0;
  }

  _addPoint(p) {
    this.points += p;
  }

  _addTail() {
    this.tail.push({x: this.x, y: this.y});
  }
}

module.exports = Snake;
