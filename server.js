'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');

const app = express();
const client = new pg.Client(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

app.get('/', renderHomePage);

app.get('/searches/new', renderSearchPage);

app.post('/searches', createSearch);

app.get('/books/:id', renderDetails);

// Callback functions
function renderHomePage(req, res) {
  let SQL = `SELECT * FROM books`;
  client.query(SQL)
    .then(results => {
      res.render('pages/index.ejs', {books: results.rows});
    });
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

function renderDetails (req, res) {
  let SQL2 = `UPDATE books
              SET bookshelf='${req.query.bookshelf}'
              WHERE title='${req.query.title}'`;
  client.query(SQL2)
    .then(() => {
      console.log('successful update');
    })
    .catch(error => console.error(error));

  let SQL = `SELECT *
            FROM books
            WHERE title='${req.query.title}'`;
  client.query(SQL)
    .then(result => {
      console.log('results.rows[0]:', result.rows[0]);
      res.render('pages/books/show.ejs', {book: result.rows[0]});
    })
    .catch(error => console.error(error));
}
// Constructors
function Book (data) {
  this.title = data.volumeInfo.title || 'title not available';
  this.description = data.volumeInfo.description || 'description not available';

  this.thumbnail = data.volumeInfo.imageLinks ? data.volumeInfo.imageLinks.thumbnail.replace(/https/gm, 'http') : 'http://via.placeholder.com/127x192?text=Image+Not+Available';

  this.author = data.volumeInfo.authors ? data.volumeInfo.authors.join(', ') : 'authors not avaiable';
  this.isbn = data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers[0].type : 'no ISBN available';
}

function errorHandler(err, req, res) {
  res.status(500).render('pages/error.ejs', {error: err});
}


client.connect()
  .then(() => {
    app.listen(PORT, console.log(`Server up on PORT ${PORT}`));
  });

