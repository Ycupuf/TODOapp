// server.js                   // (Satır başındaki // = yorum. Çalıştırıldığında yok sayılır.)

const express = require("express");   // const: sabit değişken. require("express"): CommonJS import.
const cors = require("cors");         // "cors" modülünü içe aktarır.
const fs = require("fs");             // "fs": file system (dosya sistemi) modülü.
const path = require("path");         // "path": dosya/klasör yollarını yönetmek için.

const app = express();                // express() çağrısı yeni bir uygulama (server) nesnesi döndürür.

// Orta katmanlar (middleware)
app.use(cors({ origin: true }));      // app.use(...): tüm isteklere bu katmanı uygula. { origin: true } CORS’u serbest bırakır.
app.use(express.json());              // JSON gövdeli istekleri otomatik parse eder (req.body’ye koyar).

// Statik dosyalar (public/index.html -> http://localhost:5000/)
app.use(express.static(path.join(__dirname, "public"))); 
// express.static(...) : "public" klasörünü web kökü yapar.
// path.join(__dirname, "public"): __dirname (bu dosyanın klasörü) ile "public"u güvenli biçimde birleştirir.

// Veri dosyası yolları
const dataDir = path.join(__dirname, "data");           // data klasörünün tam yolu.
const dataFile = path.join(dataDir, "todos.json");      // todos.json’un tam yolu.

// Veri deposunu garantiye al
function ensureStore() {                                 // function bildirimi. Parantez içi parametre yok.
  if (!fs.existsSync(dataDir))                           // if: koşul. !: değil (negation). existsSync: klasör var mı?
    fs.mkdirSync(dataDir, { recursive: true });          // mkdirSync: klasör oluştur. recursive: ara klasörleri de oluştur.
  if (!fs.existsSync(dataFile))                          // todos.json yoksa:
    fs.writeFileSync(dataFile, "[]", "utf-8");           // writeFileSync: eşzamanlı yaz. "[]": boş dizi JSON’u.
}
function readTodos() {                                   // Tüm todo’ları dosyadan okur.
  ensureStore();                                         // Önce depo var mı garanti et.
  return JSON.parse(fs.readFileSync(dataFile, "utf-8")); // readFileSync: metni oku. JSON.parse: JS nesnesine çevir.
}
function writeTodos(todos) {                             // Parametre: todos (array beklenir)
  fs.writeFileSync(dataFile, JSON.stringify(todos, null, 2), "utf-8");
  //pretty-print with 2-space indentation (human readable)
}


// LIST: Tüm görevler
app.get("/api/todos", (req, res) => {                    // GET /api/todos
  res.json(readTodos());                                 // dosyadan okuyup JSON olarak gönder.
});

// CREATE: Yeni görev
app.post("/api/todos", (req, res) => {                   // POST /api/todos
  const { title } = req.body || {};                      // body’den title çıkar. || {}: body yoksa boş nesne kabul et.
  if (!title || !title.trim())                           // title boşsa / sadece boşluksa:
    return res.status(400).json({ error: "title is required" }); // 400: Bad Request.

  const todos = readTodos();                              // mevcut liste
  const todo = { 
    id: Date.now(),                                      // basit benzersiz kimlik (epoch ms)
    title: title.trim(),                                  // başı/sonu kırp
    done: false,                                          // varsayılan tamamlanmadı
    created_at: new Date().toISOString()                  // oluşturulma zamanı
  };
  todos.unshift(todo);                                    // unshift: başa ekle (yeni öğe en üstte görünsün)
  writeTodos(todos);                                      // diske yaz
  res.status(201).json(todo);                             // 201: Created
});

// UPDATE: Başlık/durum güncelle
app.patch("/api/todos/:id", (req, res) => {               // PATCH /api/todos/123
  const id = Number(req.params.id);                       // :id parametresi string gelir -> sayıya çevir.
  const { title, done } = req.body || {};                 // body’den title/done al.
  const todos = readTodos();                              // mevcut liste
  const idx = todos.findIndex(t => t.id === id);          // eşleşen id’nin index’i
  if (idx === -1)                                         // bulunamazsa
    return res.status(404).json({ error: "not found" });  // 404: Bulunamadı

  if (typeof title === "string")                          // title gönderildiyse (stringse)
    todos[idx].title = title.trim();                      // güncelle/kırp
  if (typeof done === "boolean")                          // done gönderildiyse (boolean)
    todos[idx].done = done;                               // güncelle

  writeTodos(todos);                                      // diske yaz
  res.json(todos[idx]);                                   // güncellenmiş öğeyi döndür
});

// DELETE: Görev sil.
app.delete("/api/todos/:id", (req, res) => {              // DELETE /api/todos/123
  const id = Number(req.params.id);
  const todos = readTodos();
  const next = todos.filter(t => t.id !== id);            // id eşleşmeyenleri tut (silme = filtreleme)
  if (next.length === todos.length)                       // değişim yoksa, id yok demektir
    return res.status(404).json({ error: "not found" });
  writeTodos(next);                                       // yeni listeyi yaz
  res.json({ ok: true });                                 // basit onay
});

// Sunucuyu dinlet
const PORT = process.env.PORT || 5000;                    // .env’de PORT varsa onu kullan, yoksa 5000.
app.listen(PORT, () =>                                    // sunucuyu başlat ve belirtilen PORT’u dinle
  console.log(`Todo API running on http://localhost:${PORT}`) // backtick (`): template literal ile string birleştirme
);
