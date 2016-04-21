var express = require('express');
var mongo = require('mongodb').MongoClient;
var assert = require('assert');
var app = express();

//set up mongodb
var dbUrl = 'mongodb://localhost:27017/test';

app.use(express.static('./public'));
var rx = /https?:\/\/(www\.)?(\w+)\.\w+\.?(\w+)?\/?.+/;

// if server is hit at /api generate random 4 digit number
// sanity check provided url
// if server is hit at / look up key and redirect to value

// returns random number to append as short url - checks if already taken

function saveToDb(obj) {
    mongo.connect(dbUrl, function(err, db) {
        if (err) throw err;
        var urls = db.collection('urls');

        urls.insertOne(obj, function(err, result) {
            if (err) throw err;
            db.close();
        });

    });
}



// Behaviour if server is hit with a Url to shorten
app.get('/api/:str*', function(req, res) {
    var obj = {};
    var doc = {};
    var str = req.url.slice(5);

    // sanity check Url
    if (!rx.test(str)) {
        obj.error = 'Please provide URL in the proper format';
        res.send(obj);
        res.end();

    } else {
        // check for duplicate and return existing entry
        var urlCount = mongo.connect(dbUrl)
            .then(function(db) {
                return db.collection('urls');
            })
            .then(function(col) {
                return col.count({
                    fullUrl: str
                });
            })
            .then(function(count) {
                return count;
            })
            .catch(function(err) {
                console.error(err);
            });

        Promise.all([urlCount])
            .then(function(arr) {
                if (arr[0] > 0) {
                    mongo.connect(dbUrl)
                        .then(function(db) {
                            return db.collection('urls');
                        })
                        .then(function(col) {
                            return col.find({
                                fullUrl: str
                            });
                        })
                        .then(function(doc) {
                            return doc.toArray();
                        })
                        .then(function(arr) {
                            console.log(arr);
                            obj.fullUrl = arr[0].fullUrl;
                            obj.shortUrl = arr[0].shortUrl;

                            res.send(obj);
                            res.end();
                        });

                    // create new entry and return
                } else {
                    var rand = Math.floor(Math.random() * 10000);
                    doc = {
                        _id: rand,
                        fullUrl: str,
                        shortUrl: 'http://127.0.0.1:8000/' + rand
                    };
                    obj = {
                        fullUrl: str,
                        shortUrl: 'http://127.0.0.1:8000/' + rand
                    };
                    saveToDb(doc);
                    res.send(obj);
                    res.end();
                }
            });
    }
});

// Behaviour if server is hit with a shortened URL
app.get('/:str', function(req, res){
    var str = req.params.str;
    mongo.connect(dbUrl, function(err, db){
      if(err) console.error(err);
      var urls = db.collection('urls');

      urls.find({_id: Number(str)}, function(err, doc){
        if(err) console.error(err);
        doc.toArray(function(err, arr){
          if(err) console.error(err);
          if(arr === []) {
            res.send({error: 'Sorry, no link in database for the provided short URL.'});
            res.end();
          } else {
            console.log(arr[0]);
            var url = arr[0].fullUrl;
            res.redirect(url);
            res.end();
          }
        });
      });
    });
});


app.listen(8000);
