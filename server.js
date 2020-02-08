'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');

const app = express();
const PORT = process.env.PORT || 3000;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

app.get('/', renderHomePage);

app.get('/searches/new', renderSearchPage);

app.post('/searches', createSearch);

// Callback functions
function renderHomePage(req, res) {
  res.render('pages/index.ejs');
}

function renderSearchPage (req, res) {
  res.render('pages/searches/new.ejs');
}

function createSearch (req, res) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';
  // console.log('req.body:',req.body);
  // console.log('req.body.search:',req.body.search);
  if (req.body.search[1]==='title') { url += `+intitle:${req.body.search[0]}`; }

  if (req.body.search[1]==='author') { url += `+inauthor:${req.body.search[0]}`; }

  superagent.get(url)
    .then(results => {
      const bookArr = results.body.items.map(book => {
        // console.log('book.imageLinks.thumbnail:', book);
        return new Book(book);
      });
      res.render('pages/searches/show.ejs', {books: bookArr});
    })
    .catch((err) => {
      //res.render('pages/error.ejs', {error: err});
      errorHandler(err, req, res);
    });
}

// Constructors
function Book (data) {
  this.title = data.volumeInfo.title || 'title not available';
  this.description = data.volumeInfo.description || 'description not available';

  this.thumbnail = data.volumeInfo.imageLinks ? data.volumeInfo.imageLinks.thumbnail.replace(/https/gm, 'http') : 'http://via.placeholder.com/127x192?text=Image+Not+Available';

  this.author = data.volumeInfo.authors ? data.volumeInfo.authors.join(', ') : 'authors not avaiable';
  // this.thumbnail = data.volumeInfo.imageLinks.smallThumbnail || 'thumbnail not available';
}

function errorHandler(err, req, res) {
  res.status(500).render('pages/error.ejs', {error: err});
}



app.listen(PORT, console.log(`Server up on PORT ${PORT}`));

