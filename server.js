'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');

const app = express();
const client = new pg.Client(process.env.DATABASE_URL);
const PORT = process.env.PORT;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

app.get('/', renderHomePage);

app.get('/searches/new', renderSearchPage);

app.post('/searches', createSearch);

app.get('/books/:id', renderDetails);

app.post('/books', addToDatabase);

app.put('/books/:id', updateDetails);

// Callback functions
function renderHomePage(req, res) {
  let SQL = `SELECT * FROM books`;
  client.query(SQL)
    .then(results => {
      res.render('pages/index.ejs', {books: results.rows});
    })
    .catch(err => errorHandler(err, req, res));
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
  // let SQL2 = `UPDATE books
  //             SET bookshelf='${req.query.bookshelf}'
  //             WHERE title='${req.query.title}'`;
  // client.query(SQL2)
  //   .then(() => {
  //     console.log('successful update');
  //   })
  //   .catch(err => errorHandler(err, req, res));

  let id = req.params.id;
  let values = [id];

  let book;
  let bookshelves;

  let SQL = `SELECT *
            FROM books
            WHERE id=$1`;
  let SQL2 = `SELECT DISTINCT bookshelf FROM books`;
  client.query(SQL, values)
    .then(result => {
      book = result.rows[0];
    })
    .then(() => {
      client.query(SQL2)
        .then(result => {
          console.log('result:', result.rows);
          bookshelves = result.rows;
          console.log('bookshelves:', bookshelves);
          res.render('pages/books/show.ejs', {book: book, bookshelves: bookshelves});
        });
    })
    .catch(err => errorHandler(err, req, res));
}

function addToDatabase (req, res) {
  let SQL = `INSERT INTO books
            (author, title, isbn, image_url, description)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  const values = [req.body.author, req.body.title, req.body.isbn, req.body.image_url, req.body.description];

  client.query(SQL, values)
    .then(result => {
      // console.log('add to database result:', result);
      res.render('pages/books/show.ejs', {book: result.rows[0]});
    })
    .catch(err => errorHandler(err, req, res));
}

function updateDetails (req, res) {
  let id = req.params.id;
  const { title, author, isbn, image_url, description, bookshelf} = req.body;

  let SQL = 'UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5, bookshelf=$6 WHERE id = $7';
  let values = [title, author, isbn, image_url, description, bookshelf, id];

  client.query(SQL, values)
    .then(() => {
      res.redirect(`/books/${id}`);
    })
    .catch(err => errorHandler(err, req, res));
}

// Constructors
function Book (data) {
  this.title = data.volumeInfo.title || 'title not available';
  this.description = data.volumeInfo.description || 'description not available';

  this.thumbnail = data.volumeInfo.imageLinks ? data.volumeInfo.imageLinks.thumbnail.replace(/https/gm, 'http') : 'http://via.placeholder.com/127x192?text=Image+Not+Available';

  this.author = data.volumeInfo.authors ? data.volumeInfo.authors.join(', ') : 'authors not avaiable';
  this.isbn = data.volumeInfo.industryIdentifiers ? `${data.volumeInfo.industryIdentifiers[0].type}: ${data.volumeInfo.industryIdentifiers[0].identifier} ` : 'no ISBN available';
}

function errorHandler(err, req, res) {
  res.status(500).render('pages/error.ejs', {error: err});
}


client.connect()
  .then(() => {
    app.listen(PORT, console.log(`Server up on PORT ${PORT}`));
  });

