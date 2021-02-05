const express = require('express');
const mongoose = require('mongoose');
const imdb = require('imdb-api');

const app = express();
app.use(express.json());

const db = mongoose.createConnection("mongodb://localhost:27017/digital-trons", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const movieSchema = new mongoose.Schema({
    title: String,
    releasedYear: Number,
    rating: Number,
    id: String,
    genres: [String],
});

const movieModel = db.model('movie', movieSchema);

const isNullorUndefined = (val) => val === null || val === undefined;

//get movie details by movie name or imdb_id of the movie
app.get('/getmovie', async (req, res) => {
    const { title, id } = req.body;
    let dbResult = undefined;
    let searchQuery = undefined;
    let dbQuery = undefined;
    const regExp = new RegExp("^" + title + "$","i");
    if(!isNullorUndefined(title)) {
        dbResult = await movieModel.findOne({ title: { '$regex': regExp } });
        searchQuery = {name: title};
        dbQuery = {title: { '$regex': regExp }};
    } else if(!isNullorUndefined(id)) {
        dbResult = await movieModel.findOne({ id });
        searchQuery = {id: id};
        dbQuery = {id: id};
    } else {
        res.status(400).send( { err: "please provide the title or id to search" });
    }
    if(isNullorUndefined(dbResult)) {
        const omdbResponse = await imdb.get(searchQuery, {apiKey: 'ceb33d20'});
        const genreArr = omdbResponse.genres.split(", ");
        const newMovie = await movieModel({
            title: omdbResponse.title,
            releasedYear: omdbResponse.year,
            rating: omdbResponse.rating,
            id: omdbResponse.imdbid,
            genres: genreArr,
        });
        await newMovie.save();
        const dbResultAfterSave = await movieModel.findOne(dbQuery);
        res.send(dbResultAfterSave);
    } else {
        res.send(dbResult);
    }
});

//searching movie by its object-id (_id) in the database
app.get('/search-by-id/:id', async (req, res) => {
    const { id } = req.params;
    const dbResult = await movieModel.findById( id );
    if(isNullorUndefined(dbResult)) {
        res.sendStatus(404);
    } else {
        res.send(dbResult);
    }
});

//searching movies by released year
app.get('/released-year/:year', async (req, res) => {
    const { year } = req.params;
    const dbResult = await movieModel.find({ releasedYear: year });
    if(dbResult.length === 0) {
        res.sendStatus(404);
    } else {
        res.send(dbResult);
    }
});

//searching movies by released year range
app.get('/released-year', async (req, res) => {
    const { from, to } = req.query;
    const r1 = Number(from);
    const r2 = Number(to);
    const dbResult = await movieModel.find({ releasedYear: { $gte: r1, $lte: r2 } });
    if(dbResult.length === 0) {
        res.sendStatus(404);
    } else {
        res.send(dbResult);
    }
});

//searching movies by rating
app.get('/rating', async (req, res) => {
    const { query, value } = req.query;
    let searchQuery = undefined;
    if(query === "higher") {
        searchQuery = { $gt: Number(value) };
    } else if(query === "lower") {
        searchQuery = { $lt: Number(value) };
    } else {
        res.status(400).send({ err: "wrong paramaters" });
    }
    const dbResult = await movieModel.find({ rating: searchQuery });
    if(dbResult.length === 0) {
        res.sendStatus(404);
    } else {
        res.send(dbResult);
    }
});

//searching movie by its genres value
app.get('/genres/:genre', async (req, res) => {
    const { genre } = req.params;
    const regExp = new RegExp("^" + genre + "$","i");
    const dbResult = await movieModel.find({ genres: { '$regex': regExp } });
    if(dbResult.length === 0) {
        res.sendStatus(404);
    } else {
        res.send(dbResult);
    }
});

app.listen(9999, console.log("listning"));
