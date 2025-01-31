const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Configura o banco de dados
const db = new sqlite3.Database("documents.db");
db.run(
  "CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY, name TEXT, dueDate TEXT)"
);

// Endpoint para cadastrar documentos
app.post("/documents", (req, res) => {
  const { name, dueDate } = req.body;
  db.run("INSERT INTO documents (name, dueDate) VALUES (?, ?)", [name, dueDate], (err) => {
    if (err) return res.status(500).send("Erro ao salvar documento.");
    res.status(200).send("Documento cadastrado!");
  });
});

// Endpoint para listar documentos
app.get("/documents", (req, res) => {
  db.all("SELECT * FROM documents", (err, rows) => {
    if (err) return res.status(500).send("Erro ao listar documentos.");
    res.json(rows);
  });
});

//Endpoint para atualizar documento
app.put("/documents/:id", (req, res) => {
  const { id } = req.params;
  const { name, dueDate } = req.body;

  db.run("UPDATE documents SET name = ?, dueDate = ? WHERE id = ?", [name, dueDate, id], (err) => {
    if (err) return res.status(500).send("Erro ao atualizar documento.");
    res.status(200).send("Documento atualizado com sucesso!");
  });
});

//Endpoint para excluir um documento
app.delete("/documents/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM documents WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).send("Erro ao excluir documento.");
    res.status(200).send("Documento excluído com sucesso!");
  });
});


// Configuração do transporte de e-mails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rodrigodosreissilva471@gmail.com",
    pass: "ftyteorxgiikprys", // Use um app password para maior segurança
  },
});

// Verifica documentos vencendo em até 7 dias e envia e-mail
cron.schedule("* * * * *", () => {
  console.log ("Verificando documentos vencidos")
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  db.all(
    "SELECT * FROM documents WHERE dueDate BETWEEN ? AND ?",
    [today.toISOString().split("T")[0], nextWeek.toISOString().split("T")[0]],
    (err, rows) => {
      if (err) {
        console.error("Erro ao buscar documentos:", err);
        return;
      }

      if (rows.length > 0) {
        const documentList = rows
          .map((doc) => `- ${doc.name} (Vence em ${new Date(doc.dueDate).toLocaleDateString()})`)
          .join("\n");

        const mailOptions = {
          from: "rodrigodosreissilva471@gmail.com",
          to: "rodrigodosreissilva471@gmail.com",
          subject: "Lista de Documentos a Vencer",
          text: `Os seguintes documentos vencerão em 7 dias ou menos:\n\n${documentList}`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error("Erro ao enviar e-mail:", err);
          else console.log("E-mail enviado:", info.response);
        });
      }
    }
  );
});


app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
