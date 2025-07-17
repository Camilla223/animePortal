import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import axiosRateLimit from "axios-rate-limit";
import validator from "validator";
import CustomError from "../public/Utils/CustomError.js";

const app = express();
app.set("view engine", "ejs");
const port = 3000;
const API_URL = "https://api.jikan.moe/v4";
const axiosInstance = axios.create();
const rateLimitedAxios = axiosRateLimit(axiosInstance, {
  maxRequests: 1, // Maximum number of requests
  perMilliseconds: 500, // Time frame in milliseconds
  maxRPS: 1,
});

const baseURLconfig = {
  baseURL: API_URL,
};

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function getAnimeGenres() {
  try {
    const genres = await rateLimitedAxios.get(
      "genres/anime?filter=genres",
      baseURLconfig
    );
    return genres.data.data;
  } catch (error) {
    console.error(error.response.data);
    res.status(500);
  }
}

async function searchAnimes(setParams) {
  try {
    const config = {
      baseURL: API_URL,
      params: setParams,
    };
    const animes = await rateLimitedAxios.get("/anime", config);
    return animes.data.data;
  } catch (error) {
    console.error(error.response.data);
    res.status(500);
  }
}

function sanitizeID(inputID) {
  var id = parseInt(validator.escape(inputID.trim()));
  return id;
}

async function getAnime(animeID) {
  try {
    var id = sanitizeID(animeID);
    const config = {
      baseURL: API_URL,
    };
    const anime = await rateLimitedAxios.get(`/anime/${id}`, config);
    return anime.data.data;
  } catch (error) {
    return error;
  }
}

app.get("/", async (req, res) => {
  try {
    var animeGenres = await getAnimeGenres();
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  var searchParams = {
    limit: 10,
    order_by: "favorites",
    sort: "desc",
  };
  try {
    var top10favouritesAnime = await searchAnimes(searchParams);
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  searchParams = {
    limit: 10,
    order_by: "score",
    sort: "desc",
  };
  try {
    var top10ratedAnime = await searchAnimes(searchParams);
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  res.render("index", {
    favouritesAnime: top10favouritesAnime,
    popularAnime: top10ratedAnime,
    genresAnime: animeGenres,
  });
});

app.post("/search", async (req, res) => {
  var animeInput = req.body.animeInput;
  var searchParams = {
    q: animeInput,
  };
  try {
    var matchedAnimes = await searchAnimes(searchParams);
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  try {
    var animeGenres = await getAnimeGenres();
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  res.render("animes", {
    title: `Results for: ${animeInput}`,
    animeList: matchedAnimes,
    genresAnime: animeGenres,
  });
});

app.get("/genres/:name/:id", async (req, res) => {
  var genreId = req.params.id;
  var genre = req.params.name;
  try {
    var animeGenres = await getAnimeGenres();
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  var searchParams = {
    limit: 20,
    genres: genreId,
    order_by: "favorites",
    sort: "desc",
  };
  try {
    var top20AnimeGenre = await searchAnimes(searchParams);
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  res.render("animes", {
    title: `TOP 20 ${genre} ANIME`,
    animeList: top20AnimeGenre,
    genresAnime: animeGenres,
  });
});

app.get("/anime/:id", async (req, res, next) => {
  try {
    var animeGenres = await getAnimeGenres();
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  var animeId = req.params.id;
  var anime = await getAnime(animeId);
  if (typeof anime.status === "number") {
    const err = new CustomError(anime.message, anime.status);
    next(err);
  } else {
    res.render("anime", {
      anime: anime,
      genresAnime: animeGenres,
    });
  }
});

app.use("*", (req, res, next) => {
  const err = new CustomError(
    `Can't find the ${req.originalUrl} on the server!`,
    404
  );
  next(err);
});

app.use(async (error, req, res, next) => {
  try {
    var animeGenres = await getAnimeGenres();
  } catch (error) {
    console.error("Error occurred while fetching data" + error.response.data);
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "Error occured";
  res.status(error.statusCode).render("error", {
    status: error.statusCode,
    message: error.message,
    genresAnime: animeGenres,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
