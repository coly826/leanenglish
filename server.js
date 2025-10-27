const express = require("express");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Configuration EJS
app.set("view engine", "ejs");
app.set("views", "./views");

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Dossier d’upload
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Fichier local pour les contenus
const DATA_FILE = path.join(__dirname, "contents.json");

// Charger les contenus
function loadContents() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Sauvegarder les contenus
function saveContents(contents) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(contents, null, 2));
}

// 🔹 Page ADMIN
app.get("/admin", (req, res) => {
  const contents = loadContents();
  res.render("admin", { contents });
});

// 🔹 Page UTILISATEUR
app.get("/", (req, res) => {
  const allContents = loadContents();
  const sharedContents = allContents.filter((c) => c.shared);
  res.render("user", { contents: sharedContents });
});

// 🔹 Ajouter un contenu
app.post("/upload", upload.single("contentFile"), (req, res) => {
  const { contentType, contentTitle } = req.body;
  const file = req.file;

  if (!file || !contentTitle)
    return res.status(400).send("Veuillez choisir un fichier et indiquer un titre.");

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

// 🔹 Supprimer un contenu
app.post("/delete/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let contents = loadContents();
  contents = contents.filter((c) => c.id !== id);
  saveContents(contents);
  res.redirect("/admin");
});

// 🔹 Partager / cacher un contenu
app.post("/toggle/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const contents = loadContents();
  const content = contents.find((c) => c.id === id);
  if (content) {
    content.shared = !content.shared;
    saveContents(contents);
  }
  res.redirect("/admin");
});

// 🔹 Lancement du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur E-Learning lancé :
  👩‍🏫 Admin → http://localhost:${PORT}/admin
  👨‍🎓 Utilisateur → http://localhost:${PORT}/`);
});
