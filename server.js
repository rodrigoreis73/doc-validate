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


/*
// Verifica documentos a vencer e envia alertas
cron.schedule("0 8 * * *", () => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  db.all(
    "SELECT * FROM documents WHERE dueDate = ?",
    [nextWeek.toISOString().split("T")[0]],
    (err, rows) => {
      if (rows.length > 0) {
        rows.forEach((doc) => {
          const mailOptions = {
            from: "rodrigodosreissilva471@gmail.com",
            to: "rodrigodosreissilva471@gmail.com",
            subject: "Alerta de Vencimento de Documento",
            text: `O documento "${doc.name}" vence em uma semana!`,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("Erro ao enviar e-mail:", err);
            else console.log("E-mail enviado:", info.response);
          });
        });
      }
    }
  );
}); */

//START - FuCTION LOGIN

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SECRET_KEY = "seu_segredo_seguro"; // Use uma chave forte

// Simulação de usuário no banco (você pode usar SQLite)
const users = [{ email: "admin@example.com", password: bcrypt.hashSync("123456", 8) }];

// Endpoint de login
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
});

// Middleware para proteger rotas
const authenticate = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Token não fornecido" });

    jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token inválido" });
        req.user = decoded;
        next();
    });
};

// Aplicar proteção às rotas
app.get("/documents", authenticate, (req, res) => {
    db.all("SELECT * FROM documents", (err, rows) => {
        if (err) return res.status(500).send("Erro ao listar documentos.");
        res.json(rows);
    });
});

app.post("/documents", authenticate, (req, res) => {
    const { name, dueDate } = req.body;
    db.run("INSERT INTO documents (name, dueDate) VALUES (?, ?)", [name, dueDate], (err) => {
        if (err) return res.status(500).send("Erro ao salvar documento.");
        res.status(200).send("Documento cadastrado!");
    });
});

async function loadDocuments() {
  const token = localStorage.getItem("token");
  if (!token) {
      window.location.href = "login.html";
      return;
  }

  const response = await fetch("http://localhost:3000/documents", {
      headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
      alert("Sessão expirada. Faça login novamente.");
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
  }

  const documents = await response.json();
  documentList.innerHTML = documents
      .map((doc) => `<tr><td>${doc.name}</td><td>${new Date(doc.dueDate).toLocaleDateString()}</td></tr>`)
      .join("");
}

// Executa o carregamento dos documentos ao iniciar
loadDocuments();


//FIM - FUNCTION LOGIN


app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
