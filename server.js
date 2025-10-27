const express = require("express");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = 3000;

// Identifiants ADMIN
const ADMIN_EMAIL = "admin@elearning.com";
const ADMIN_PASSWORD = "admin123";

// Configuration EJS
app.set("view engine", "ejs");
app.set("views", "./views");

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "secret_elearning",
  resave: false,
  saveUninitialized: true
}));

// Dossier d’upload
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// --- Gestion des contenus ---
const DATA_FILE = path.join(__dirname, "contents.json");
function loadContents() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}
function saveContents(contents) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(contents, null, 2));
}

// --- Gestion des exercices ---
const EXERCISE_FILE = path.join(__dirname, "exercises.json");
function loadExercises() {
  try {
    const data = fs.readFileSync(EXERCISE_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}
function saveExercises(exercises) {
  fs.writeFileSync(EXERCISE_FILE, JSON.stringify(exercises, null, 2));
}

// --- Middleware admin ---
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) next();
  else res.redirect("/login");
}

// --- Routes Auth ---
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/admin");
  } else {
    res.render("login", { error: "Identifiants incorrects! Cette est accessible uniquement pour l'administrateur !" });
  }
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// --- Routes Admin Contenus ---
app.get("/admin", requireAdmin, (req, res) => {
  const contents = loadContents();
  res.render("admin", { contents });
});

app.post("/upload", requireAdmin, upload.single("contentFile"), (req, res) => {
  const { contentType, contentTitle } = req.body;
  const file = req.file;
  if (!file || !contentTitle) return res.status(400).send("Fichier ou titre manquant.");

  const contents = loadContents();
  const newContent = {
    id: Date.now(),
    type: contentType,
    title: contentTitle,
    fileName: file.originalname,
    filePath: "/uploads/" + file.filename,
    shared: false,
  };

  contents.push(newContent);
  saveContents(contents);
  res.redirect("/admin");
});

app.post("/delete/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  let contents = loadContents().filter(c => c.id !== id);
  saveContents(contents);
  res.redirect("/admin");
});

app.post("/toggle/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const contents = loadContents();
  const content = contents.find(c => c.id === id);
  if (content) content.shared = !content.shared;
  saveContents(contents);
  res.redirect("/admin");
});

// --- Routes Exercices ---
app.get("/exercises", (req, res) => {
  const exercises = loadExercises();
  res.render("exercises", { exercises });
});

app.post("/check-answer", (req, res) => {
  const { id, userAnswer } = req.body;
  const exercises = loadExercises();
  const ex = exercises.find(e => e.id === parseInt(id));
  if (!ex) return res.status(404).send("Exercice introuvable");
  const correct = ex.answer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
  res.json({ correct, correctAnswer: ex.answer });
});

app.get("/admin/exercises", requireAdmin, (req, res) => {
  const exercises = loadExercises();
  res.render("admin_exercises", { exercises });
});

app.post("/admin/exercises/add", requireAdmin, (req, res) => {
  const { level, question, options, answer } = req.body;
  const exercises = loadExercises();
  const newEx = {
    id: Date.now(),
    level,
    question,
    options: options.split(",").map(o => o.trim()),
    answer
  };
  exercises.push(newEx);
  saveExercises(exercises);
  res.redirect("/admin/exercises");
});

app.post("/admin/exercises/delete/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  let exercises = loadExercises().filter(e => e.id !== id);
  saveExercises(exercises);
  res.redirect("/admin/exercises");
});

// --- Routes Utilisateur ---
app.get("/", (req, res) => {
  const sharedContents = loadContents().filter(c => c.shared);
  res.render("user", { contents: sharedContents });
});

// --- Lancer le serveur ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé :
  👨‍🏫 Admin → http://localhost:${PORT}/admin
  👩‍🎓 Utilisateur → http://localhost:${PORT}/
  📝 Exercices → http://localhost:${PORT}/exercises`);
});
