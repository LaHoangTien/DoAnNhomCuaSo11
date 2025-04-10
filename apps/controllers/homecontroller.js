// filepath: c:\DoAnNhomCuaSo11\apps\controllers\homecontroller.js
var express = require("express");
var router = express.Router();
var db = require("../../db");

router.get("/phimmoi", function(req, res) {
    res.render("home/home");
});
router.get("/error", function(req,res){
    res.render("home/error.ejs");
});
// Hàm lấy thông tin phim kèm chi tiết
async function getMoviesWithDetails(query, params, res, returnAsObject = false) {
    try {
        const [movies] = await db.promise().query(query, params);
        if (movies.length === 0) return res.json(returnAsObject ? { movies: [] } : []);

        const movieIds = movies.map(movie => movie.id);
        
        // Lấy tất cả dữ liệu liên quan trong 1 lần gọi DB để tối ưu hiệu suất
        const [episodes] = await db.promise().query("SELECT * FROM episodes WHERE movie_id IN (?)", [movieIds]);
        const [countries] = await db.promise().query("SELECT c.*, mc.movie_id FROM countries c JOIN movie_countries mc ON c.id = mc.country_id WHERE mc.movie_id IN (?)", [movieIds]);
        const [categories] = await db.promise().query("SELECT cat.*, mc.movie_id FROM categories cat JOIN movie_categories mc ON cat.id = mc.category_id WHERE mc.movie_id IN (?)", [movieIds]);
        const [actors] = await db.promise().query("SELECT a.*, ma.movie_id FROM actors a JOIN movie_actors ma ON a.id = ma.actor_id WHERE ma.movie_id IN (?)", [movieIds]);
        const [directors] = await db.promise().query("SELECT d.*, md.movie_id FROM directors d JOIN movie_directors md ON d.id = md.director_id WHERE md.movie_id IN (?)", [movieIds]);

        // Gắn dữ liệu vào từng movie
        const moviesWithDetails = movies.map(movie => ({
            ...movie,
            episodes: episodes.filter(e => e.movie_id === movie.id),
            countries: countries.filter(c => c.movie_id === movie.id),
            categories: categories.filter(c => c.movie_id === movie.id),
            actors: actors.filter(a => a.movie_id === movie.id),
            directors: directors.filter(d => d.movie_id === movie.id),
        }));

        res.json(returnAsObject ? { movies: moviesWithDetails } : moviesWithDetails);
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
router.get("/api/movies/search", async (req, res) => {
    const { keyword, director, actor, limit = 10 } = req.query;

    let query = "SELECT DISTINCT movies.* FROM movies";
    let params = [];

    if (keyword || actor || director) {
        
        query += " WHERE 1=1";

        if (keyword) {
            query += " AND (movies.name LIKE ? OR movies.origin_name LIKE ?)";
            params.push(`%${keyword}%`, `%${keyword}%`);
          
        }

        
    } else {
        query += " WHERE 1=1";
    }
    try {
        await getMoviesWithDetails(query, params, res, true); // Gọi hàm để lấy đầy đủ thông tin
    } catch (error) {
        console.error("Lỗi khi tìm kiếm phim:", error);
        res.status(500).json({ error: "Lỗi server, vui lòng thử lại" });
    }
});

router.get("/filter", function(req, res) {
    res.render("home/filter");
});
router.get("/api/movies/filter", (req, res) => {
    const { genre, country, year, type, sortBy, keyword, actor, director, page = 1, limit = 24 } = req.query;

    let baseQuery = " FROM movies";
    let countQuery = "SELECT COUNT(DISTINCT movies.id) AS total " + baseQuery;
    let dataQuery = "SELECT DISTINCT movies.* " + baseQuery;
    let params = [];

    if (keyword || actor || director) {
        const joinActorsDirectors = `
            LEFT JOIN movie_actors ma ON movies.id = ma.movie_id
            LEFT JOIN actors a ON ma.actor_id = a.id
            LEFT JOIN movie_directors md ON movies.id = md.movie_id
            LEFT JOIN directors d ON md.director_id = d.id
        `;
        baseQuery += joinActorsDirectors;
        countQuery += joinActorsDirectors;
        dataQuery += joinActorsDirectors;
    }

    let whereClauses = ["1=1"];

    if (keyword) {
        whereClauses.push("(movies.name LIKE ? OR a.name LIKE ? OR d.name LIKE ?)");
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (actor) {
        whereClauses.push("a.name LIKE ?");
        params.push(`%${actor}%`);
    }
    if (director) {
        whereClauses.push("d.name LIKE ?");
        params.push(`%${director}%`);
    }
    if (genre) {
        const genres = genre.split(',');
        whereClauses.push(`movies.id IN (SELECT movie_id FROM movie_categories WHERE category_id IN (SELECT id FROM categories WHERE slug IN (${genres.map(() => '?').join(',')})))`);
        params.push(...genres);
    }
    if (country) {
        const countries = country.split(',');
        whereClauses.push(`movies.id IN (SELECT movie_id FROM movie_countries WHERE country_id IN (SELECT id FROM countries WHERE slug IN (${countries.map(() => '?').join(',')})))`);
        params.push(...countries);
    }
    if (year) {
        const years = year.split(',');
        whereClauses.push(`movies.year IN (${years.map(() => '?').join(',')})`);
        params.push(...years);
    }
    if (type) {
        const types = type.split(',');
        whereClauses.push(`movies.type IN (${types.map(() => '?').join(',')})`);
        params.push(...types);
    }

    const whereSQL = whereClauses.length ? " WHERE " + whereClauses.join(" AND ") : "";
    countQuery += whereSQL;
    dataQuery += whereSQL;

    if (sortBy === 'year') {
        dataQuery += " ORDER BY movies.year DESC";
    } else {
        dataQuery += " ORDER BY movies.modified_time DESC";
    }

    const offset = (page - 1) * limit;
    dataQuery += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    db.query(countQuery, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalMovies = countResult[0].total;
        const totalPage = Math.ceil(totalMovies / limit);

        db.query(dataQuery, params, (err, movies) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ movies, totalPage });
        });
    });
});

// 🎬 API: Lấy danh sách các tiêu chí lọc
router.get("/api/movies/filters", async (req, res) => {
    try {
        const [genres] = await db.promise().query("SELECT * FROM categories");
        const [countries] = await db.promise().query("SELECT * FROM countries");
        const [years] = await db.promise().query("SELECT DISTINCT year FROM movies ORDER BY year DESC");
        const [types] = await db.promise().query("SELECT DISTINCT type FROM movies");

        res.json({
            genres,
            countries,
            years,
            types
        });
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// 🎬 API: Lấy 5 phim mới nhất
router.get("/api/movies", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies ORDER BY modified_time DESC LIMIT 6", [], res);
});

// 🎬 API: Lấy 20 phim thể loại hoạt hình
router.get("/api/movies/hoathinh", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies WHERE type = 'hoathinh' ORDER BY modified_time DESC LIMIT 20", [], res);
});

router.get("/api/movies/tvshows", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies WHERE type = 'tvshows' ORDER BY modified_time DESC LIMIT 20", [], res);
});

router.get("/api/movies/anime", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies m JOIN movie_countries mc ON m.id = mc.movie_id WHERE mc.country_id = 'd4097fbffa8f7149a61281437171eb83' AND m.type = 'hoathinh' AND m.chieurap != 1 ORDER BY modified_time DESC LIMIT 20",
        [], res);
});

// 🎬 API: Lấy phim Trung Quốc (trừ hoạt hình)
router.get("/api/movies/trungquoc", (req, res) => {
    getMoviesWithDetails(
        "SELECT * FROM movies m JOIN movie_countries mc ON m.id = mc.movie_id WHERE mc.country_id = '3e075636c731fe0f889c69e0bf82c083' AND m.type NOT IN ('hoathinh', 'tvshows') AND m.chieurap != 1 AND m.year > 2015 ORDER BY modified_time DESC LIMIT 20",
        [],
        res
    );
});

// 🎬 API: Lấy phim Hàn Quốc (trừ hoạt hình)
router.get("/api/movies/hanquoc", (req, res) => {
    getMoviesWithDetails(
        "SELECT * FROM movies m JOIN movie_countries mc ON m.id = mc.movie_id WHERE mc.country_id = '05de95be5fc404da9680bbb3dd8262e6' AND m.type NOT IN ('hoathinh', 'tvshows') AND m.chieurap != 1 AND m.year > 2015 ORDER BY modified_time DESC LIMIT 20",
        [],
        res
    );
});

// 🎬 API: Lấy 20 phim thể loại hoạt hình
router.get("/api/movies/chieurap", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies WHERE chieurap = '1' ORDER BY modified_time DESC LIMIT 20", [], res);
});

router.get("/api/movies/longtieng", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies WHERE lang IN ('Lồng Tiếng', 'Vietsub + Lồng Tiếng','Vietsub + Lồng Tiếng + Thuyết Minh') AND type NOT IN ('tvshows')AND year > 2015 AND chieurap != '1' ORDER BY modified_time DESC LIMIT 20", [], res);
});

router.get("/api/movies/phimcu", (req, res) => {
    getMoviesWithDetails("SELECT * FROM movies WHERE year <= 2015 AND type NOT IN ('hoathinh', 'tvshows') ORDER BY modified_time DESC LIMIT 20", [], res);
});

router.get("/xem/:slug/:episode/:server", function (req, res) {
    res.render("home/watch");
});

router.get("/phim/:slug", function(req, res) {
    res.render("home/detail");
});

router.get("/api/movies/:slug", function(req, res) {
    const movieSlug = req.params.slug;

    db.query("SELECT * FROM movies WHERE slug = ?", [movieSlug], function(err, movie) {
        if (err) throw err;
        if (movie.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        db.query("SELECT * FROM episodes WHERE movie_id = ?", [movie[0].id], function(err, episodes) {
            if (err) throw err;

            db.query("SELECT c.* FROM countries c JOIN movie_countries mc ON c.id = mc.country_id WHERE mc.movie_id = ?", [movie[0].id], function(err, countries) {
                if (err) throw err;

                db.query("SELECT cat.* FROM categories cat JOIN movie_categories mc ON cat.id = mc.category_id WHERE mc.movie_id = ?", [movie[0].id], function(err, categories) {
                    if (err) throw err;

                    db.query("SELECT a.* FROM actors a JOIN movie_actors ma ON a.id = ma.actor_id WHERE ma.movie_id = ?", [movie[0].id], function(err, actors) {
                        if (err) throw err;

                        db.query("SELECT d.* FROM directors d JOIN movie_directors md ON d.id = md.director_id WHERE md.movie_id = ?", [movie[0].id], function(err, directors) {
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