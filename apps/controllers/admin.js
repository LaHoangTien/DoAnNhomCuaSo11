// filepath: c:\DoAnNhomCuaSo11\apps\controllers\admin.js
var express = require("express");
var router = express.Router();
var db = require("../../db");
var cheerio = require("cheerio");
var cron = require("node-cron");
var { authenticateToken, authorizeRole } = require("../middlewares/authMiddleware");
const {  authenticate, authorizeAdmin } = require("../middlewares/auth");

router.get("/admin/movies", authenticate, authorizeAdmin, function(req, res) {
    res.render("admin/movies.ejs");
});
router.get("/api/me", authenticate, (req, res) => {
    res.json({ id: req.user.id, role_id: req.user.role_id });
});

router.get("/api/admin/movies", authenticateToken, authorizeRole(1), function(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    db.query("SELECT * FROM movies ORDER BY modified_time DESC LIMIT ? OFFSET ?", [limit, offset], function(err, movies) {
        if (err) throw err;
        if (movies.length === 0) {
            return res.json({
                movies: [],
                page: page,
                totalPages: 0,
                totalMovies: 0
            });
        }
        const movieIds = movies.map(movie => movie.id);

        db.query("SELECT * FROM episodes WHERE movie_id IN (?)", [movieIds], function(err, episodes) {
            if (err) throw err;

            db.query("SELECT c.*, mc.movie_id FROM countries c JOIN movie_countries mc ON c.id = mc.country_id WHERE mc.movie_id IN (?)", [movieIds], function(err, countries) {
                if (err) throw err;

                db.query("SELECT cat.*, mc.movie_id FROM categories cat JOIN movie_categories mc ON cat.id = mc.category_id WHERE mc.movie_id IN (?)", [movieIds], function(err, categories) {
                    if (err) throw err;

                    db.query("SELECT a.*, ma.movie_id FROM actors a JOIN movie_actors ma ON a.id = ma.actor_id WHERE ma.movie_id IN (?)", [movieIds], function(err, actors) {
                        if (err) throw err;

                        db.query("SELECT d.*, md.movie_id FROM directors d JOIN movie_directors md ON d.id = md.director_id WHERE md.movie_id IN (?)", [movieIds], function(err, directors) {
                            if (err) throw err;

                            const moviesWithDetails = movies.map(movie => {
                                movie.episodes = episodes.filter(episode => episode.movie_id === movie.id);
                                movie.countries = countries.filter(country => country.movie_id === movie.id);
                                movie.categories = categories.filter(category => category.movie_id === movie.id);
                                movie.actors = actors.filter(actor => actor.movie_id === movie.id);
                                movie.directors = directors.filter(director => director.movie_id === movie.id);
                                return movie;
                            });

                            db.query("SELECT COUNT(*) AS total FROM movies", function(err, result) {
                                if (err) throw err;
                                const totalMovies = result[0].total;
                                const totalPages = Math.ceil(totalMovies / limit);

                                res.json({
                                    movies: moviesWithDetails,
                                    page: page,
                                    totalPages: totalPages,
                                    totalMovies: totalMovies
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

router.delete("/api/delete/movies/:id", authenticateToken, authorizeRole(1), function(req, res) {
    const movieId = req.params.id;

    // First, delete related records in other tables
    db.query("DELETE FROM episodes WHERE movie_id = ?", [movieId], function(err, result) {
        if (err) throw err;

        db.query("DELETE FROM movie_actors WHERE movie_id = ?", [movieId], function(err, result) {
            if (err) throw err;

            db.query("DELETE FROM movie_categories WHERE movie_id = ?", [movieId], function(err, result) {
                if (err) throw err;

                db.query("DELETE FROM movie_countries WHERE movie_id = ?", [movieId], function(err, result) {
                    if (err) throw err;

                    db.query("DELETE FROM movie_directors WHERE movie_id = ?", [movieId], function(err, result) {
                        if (err) throw err;

                        // Then, delete the movie
                        db.query("DELETE FROM movies WHERE id = ?", [movieId], function(err, result) {
                            if (err) throw err;
                            res.json({ message: "Movie deleted successfully" });
                        });
                    });
                });
            });
        });
    });
});

// API to delete an episode
router.delete("/api/admin/episodes/:id", authenticateToken, authorizeRole(1), function(req, res) {
    const episodeId = req.params.id;

    db.query("DELETE FROM episodes WHERE id = ?", [episodeId], function(err, result) {
        if (err) throw err;
        res.json({ message: "Episode deleted successfully" });
    });
});

// API to update a movie
router.put("/api/admin/movies/:id", authenticateToken, authorizeRole(1), function(req, res) {
    const movieId = req.params.id;
    const updatedMovie = {
        name: req.body.name,
        origin_name: req.body.origin_name,
        content: req.body.content,
        type: req.body.type,
        status: req.body.status,
        thumb_url: req.body.thumb_url,
        trailer_url: req.body.trailer_url,
        time: req.body.time,
        episode_current: req.body.episode_current,
        episode_total: req.body.episode_total,
        quality: req.body.quality,
        lang: req.body.lang,
        notify: req.body.notify,
        showtimes: req.body.showtimes,
        slug: req.body.slug,
        year: req.body.year,
        view: req.body.view,
        poster_url: req.body.poster_url,
        is_copyright: req.body.is_copyright,
        chieurap: req.body.chieurap,
        sub_docquyen: req.body.sub_docquyen,
        modified_time: new Date()
    };

    db.query("UPDATE movies SET ? WHERE id = ?", [updatedMovie, movieId], function(err, result) {
        if (err) throw err;
        res.json({ message: "Movie updated successfully" });
    });
});

// API to get movie details
router.get("/api/admin/movies/:id", authenticateToken, authorizeRole(1), function(req, res) {
    const movieId = req.params.id;

    db.query("SELECT * FROM movies WHERE id = ?", [movieId], function(err, movie) {
        if (err) throw err;

        db.query("SELECT * FROM episodes WHERE movie_id = ?", [movieId], function(err, episodes) {
            if (err) throw err;

            db.query("SELECT c.* FROM countries c JOIN movie_countries mc ON c.id = mc.country_id WHERE mc.movie_id = ?", [movieId], function(err, countries) {
                if (err) throw err;

                db.query("SELECT cat.* FROM categories cat JOIN movie_categories mc ON cat.id = mc.category_id WHERE mc.movie_id = ?", [movieId], function(err, categories) {
                    if (err) throw err;

                    db.query("SELECT a.* FROM actors a JOIN movie_actors ma ON a.id = ma.actor_id WHERE ma.movie_id = ?", [movieId], function(err, actors) {
                        if (err) throw err;

                        db.query("SELECT d.* FROM directors d JOIN movie_directors md ON d.id = md.director_id WHERE md.movie_id = ?", [movieId], function(err, directors) {
                            if (err) throw err;

                            const movieDetails = {
                                ...movie[0],
                                episodes: episodes,
                                countries: countries,
                                categories: categories,
                                actors: actors,
                                directors: directors
                            };

                            res.json(movieDetails);
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;