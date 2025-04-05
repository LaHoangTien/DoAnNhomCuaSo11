// var express = require("express");
// var router = express.Router();
// var axios = require("axios");
// var db = require("../../db");
// var cheerio = require("cheerio");
// var cron = require("node-cron");

// router.get("/api/ophim", function(req, res) {
//     res.render("admin/api_movies");
// });

// async function addMovie(slug) {
//     try {
//         const response = await axios.get(`https://ophim1.com/phim/${slug}`);
//         const movieData = response.data.movie;

//         // Sử dụng cheerio để làm sạch nội dung
//         const $ = cheerio.load(movieData.content);
//         $('p').each(function() {
//             if ($(this).html().trim() === '&nbsp;') {
//                 $(this).remove();
//             }
//         });
//         const cleanedContent = $.html();

//         var movie = {
//             id: movieData._id,
//             name: movieData.name,
//             origin_name: movieData.origin_name,
//             content: cleanedContent,
//             type: movieData.type,
//             status: movieData.status,
//             thumb_url: movieData.thumb_url,
//             trailer_url: movieData.trailer_url,
//             time: movieData.time,
//             episode_current: movieData.episode_current,
//             episode_total: movieData.episode_total,
//             quality: movieData.quality,
//             lang: movieData.lang,
//             notify: movieData.notify,
//             showtimes: movieData.showtimes,
//             slug: movieData.slug,
//             year: movieData.year,
//             view: movieData.view,
//             poster_url: movieData.poster_url,
//             created_time: new Date(movieData.created.time),
//             modified_time: new Date() // Sử dụng thời gian hiện tại
//         };

//         // Kiểm tra và thêm phim vào cơ sở dữ liệu
//         const [movieResults] = await db.promise().query("SELECT * FROM movies WHERE id = ?", [movie.id]);
//         if (movieResults.length === 0) {
//             await db.promise().query("INSERT INTO movies SET ?", movie);
//         }

//         let newEpisodesAdded = false;

//         // Kiểm tra và thêm các tập phim vào cơ sở dữ liệu
//         const episodes = response.data.episodes; // Sửa lại cách lấy episodes

//         if (Array.isArray(episodes) && episodes.length > 0) {
//             for (const episode of episodes) {
//                 if (Array.isArray(episode.server_data) && episode.server_data.length > 0) {
//                     for (const ep of episode.server_data) {
//                         try {
//                             const [episodeResults] = await db.promise().query(
//                                 "SELECT * FROM episodes WHERE movie_id = ? AND name = ?",
//                                 [movie.id, ep.name]
//                             );

//                             if (episodeResults.length === 0) {
//                                 var episodeData = {
//                                     movie_id: movie.id,
//                                     server_name: episode.server_name,
//                                     name: ep.name,
//                                     slug: ep.slug,
//                                     filename: ep.filename,
//                                     link_embed: ep.link_embed,
//                                     link_m3u8: ep.link_m3u8
//                                 };

//                                 await db.promise().query("INSERT INTO episodes SET ?", episodeData);
//                                 newEpisodesAdded = true;
//                             }
//                         } catch (episodeError) {
//                             console.error(`❌ Lỗi khi thêm tập ${ep.name}:`, episodeError);
//                         }
//                     }
//                 } else {
//                     console.warn(`⚠️ Không có server_data cho tập phim: ${episode.server_name}`);
//                 }
//             }
//         } else {
//             console.warn("⚠️ Không có tập phim nào trong API!");
//         }

//         // Cập nhật modified_time nếu phim đã tồn tại và có tập mới được thêm vào
//         if (movieResults.length > 0 && newEpisodesAdded) {
//             await db.promise().query("UPDATE movies SET modified_time = ? WHERE id = ?", [new Date(), movie.id]);
//         }

//         // Kiểm tra và thêm diễn viên vào cơ sở dữ liệu
//         for (const actorName of movieData.actor) {
//             const [actorResults] = await db.promise().query("SELECT * FROM actors WHERE name = ?", [actorName]);
//             if (actorResults.length === 0) {
//                 const [result] = await db.promise().query("INSERT INTO actors (name) VALUES (?)", [actorName]);
//                 await db.promise().query("INSERT INTO movie_actors (movie_id, actor_id) VALUES (?, ?)", [movie.id, result.insertId]);
//             } else {
//                 const [movieActorResults] = await db.promise().query("SELECT * FROM movie_actors WHERE movie_id = ? AND actor_id = ?", [movie.id, actorResults[0].id]);
//                 if (movieActorResults.length === 0) {
//                     await db.promise().query("INSERT INTO movie_actors (movie_id, actor_id) VALUES (?, ?)", [movie.id, actorResults[0].id]);
//                 }
//             }
//         }

//         // Kiểm tra và thêm đạo diễn vào cơ sở dữ liệu
//         for (const directorName of movieData.director) {
//             const [directorResults] = await db.promise().query("SELECT * FROM directors WHERE name = ?", [directorName]);
//             if (directorResults.length === 0) {
//                 const [result] = await db.promise().query("INSERT INTO directors (name) VALUES (?)", [directorName]);
//                 await db.promise().query("INSERT INTO movie_directors (movie_id, director_id) VALUES (?, ?)", [movie.id, result.insertId]);
//             } else {
//                 const [movieDirectorResults] = await db.promise().query("SELECT * FROM movie_directors WHERE movie_id = ? AND director_id = ?", [movie.id, directorResults[0].id]);
//                 if (movieDirectorResults.length === 0) {
//                     await db.promise().query("INSERT INTO movie_directors (movie_id, director_id) VALUES (?, ?)", [movie.id, directorResults[0].id]);
//                 }
//             }
//         }

//         // Kiểm tra và thêm quốc gia vào cơ sở dữ liệu
//         for (const country of movieData.country) {
//             const [countryResults] = await db.promise().query("SELECT * FROM countries WHERE id = ?", [country.id]);
//             if (countryResults.length === 0) {
//                 await db.promise().query("INSERT INTO countries SET ?", country);
//                 await db.promise().query("INSERT INTO movie_countries (movie_id, country_id) VALUES (?, ?)", [movie.id, country.id]);
//             } else {
//                 const [movieCountryResults] = await db.promise().query("SELECT * FROM movie_countries WHERE movie_id = ? AND country_id = ?", [movie.id, country.id]);
//                 if (movieCountryResults.length === 0) {
//                     await db.promise().query("INSERT INTO movie_countries (movie_id, country_id) VALUES (?, ?)", [movie.id, country.id]);
//                 }
//             }
//         }

//         // Kiểm tra và thêm thể loại vào cơ sở dữ liệu
//         for (const category of movieData.category) {
//             const [categoryResults] = await db.promise().query("SELECT * FROM categories WHERE id = ?", [category.id]);
//             if (categoryResults.length === 0) {
//                 await db.promise().query("INSERT INTO categories SET ?", category);
//                 await db.promise().query("INSERT INTO movie_categories (movie_id, category_id) VALUES (?, ?)", [movie.id, category.id]);
//             } else {
//                 const [movieCategoryResults] = await db.promise().query("SELECT * FROM movie_categories WHERE movie_id = ? AND category_id = ?", [movie.id, category.id]);
//                 if (movieCategoryResults.length === 0) {
//                     await db.promise().query("INSERT INTO movie_categories (movie_id, category_id) VALUES (?, ?)", [movie.id, category.id]);
//                 }
//             }
//         }

//         console.log(`✅ Movie ${movie.name} added/updated successfully`);
//     } catch (error) {
//         console.error(`❌ Error adding/updating movie ${slug}:`, error);
//     }
// }

// // Hẹn giờ để thêm phim từ API mỗi ngày vào lúc 2 giờ sáng
// cron.schedule('0 11 * * *', async () => {
//     console.log('⏰ Running scheduled task to add/update movies from API');
//     try {
//         const response = await axios.get('https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1');
//         const movies = response.data.items;
//         for (const movie of movies) {
//             await addMovie(movie.slug);
//         }
//     } catch (error) {
//         console.error('❌ Error fetching movie list from API:', error);
//     }
// });

// // Hẹn giờ để cập nhật các phim hiện có trong cơ sở dữ liệu mỗi ngày vào lúc 3 giờ sáng
// cron.schedule('19 21 * * *', async () => {
//     console.log('⏰ Running scheduled task to update existing movies from database');
//     try {
//         const [movies] = await db.promise().query("SELECT slug FROM movies WHERE status != 'completed'");

//         // Chạy cập nhật song song
//         await Promise.all(movies.map(movie => addMovie(movie.slug)));

//         console.log('✅ All movies updated successfully');
//     } catch (error) {
//         console.error('❌ Error updating movies from database:', error);
//     }
// });



// router.post("/api/ophim/add/:slug", async function (req, res) {
//     const slug = req.params.slug;
//     await addMovie(slug);
//     res.json({ success: true, message: "Movie added/updated successfully" });
// });

// module.exports = router;