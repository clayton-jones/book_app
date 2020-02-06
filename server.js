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
      // console.log(results.body.items[0]);
      const bookArr = results.body.items.map(book => {
        // console.log('book.imageLinks.thumbnail:', book);
        return new Book(book);
      });
      res.render('pages/searches/show.ejs', {books: bookArr});
    });
}

// Constructors
function Book (data) {
  console.log('data:',data.volumeInfo.imageLinks);
  this.title = data.volumeInfo.title || 'title not available';
  this.description = data.volumeInfo.description || 'description not available';
  // if (regexx.test(data.imageLinks.thumbnail)) {

  // }
  this.thumbnail = data.volumeInfo.imageLinks ? data.volumeInfo.imageLinks.thumbnail : 'thumbnail not available';

  this.author = data.volumeInfo.authors;
  // this.thumbnail = data.volumeInfo.imageLinks.smallThumbnail || 'thumbnail not available';
}

app.listen(PORT, console.log(`Server up on PORT ${PORT}`));

