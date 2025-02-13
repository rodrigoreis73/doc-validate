const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Configura o banco de dados
const db = new sqlite3.Database("documents.db");

db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY, 
    unidadeName TEXT, 
    docName TEXT, 
    typeDoc TEXT, 
    dueDate TEXT, 
    nameResp TEXT, 
    email TEXT, 
    period TEXT,
    lastAlert TEXT
  )
`);

app.post("/documents", (req, res) => {
  const { unidadeName, docName, typeDoc, dueDate, nameResp, email, period } =
    req.body;
  db.run(
    "INSERT INTO documents (unidadeName, docName, typeDoc, dueDate, nameResp, email, period) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [unidadeName, docName, typeDoc, dueDate, nameResp, email, period],
    (err) => {
      if (err) return res.status(500).send("Erro ao salvar documento.");
      res.status(200).send("Documento cadastrado!");
    }
  );
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
  const { unidadeName, docName, typeDoc, dueDate, nameResp, email, period } =
    req.body;

  // Buscar o documento atual antes de editar
  db.get("SELECT dueDate FROM documents WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).send("Erro ao buscar documento.");

    const dueDateChanged = row && row.dueDate !== dueDate; // Verifica se a dueDate foi alterada

    // Se dueDate foi alterado, resetamos o lastAlert
    const updateQuery = dueDateChanged
      ? "UPDATE documents SET unidadeName = ?, docName = ?, typeDoc = ?, dueDate = ?, nameResp = ?, email = ?, period = ?, lastAlert = null WHERE id = ?"
      : "UPDATE documents SET unidadeName = ?, docName = ?, typeDoc = ?, dueDate = ?, nameResp = ?, email = ?, period = ? WHERE id = ?";

    const params = dueDateChanged
      ? [unidadeName, docName, typeDoc, dueDate, nameResp, email, period, id]
      : [unidadeName, docName, typeDoc, dueDate, nameResp, email, period, id];

    db.run(updateQuery, params, (updateErr) => {
      if (updateErr)
        return res.status(500).send("Erro ao atualizar documento.");
      res.status(200).send("Documento atualizado com sucesso!");
    });
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

// Cron job para checar lastAlert

cron.schedule("* * * * *", () => {
  // Executa diariamente às 08:00
  console.log("Verificando documentos para envio de alerta...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  db.all("SELECT * FROM documents", [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar documentos:", err);
      return;
    }

    rows.forEach((doc) => {
      const alertDays = parseInt(doc.period.match(/\d+/)?.[0] || "0"); // Extrai o número de dias do período
      const dueDate = new Date(doc.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Calcula a data de alerta
      const alertDate = new Date(dueDate);
      alertDate.setDate(dueDate.getDate() - alertDays);

      console.log(`📅 Documento ID ${doc.id}`);
      console.log(`➡️ DueDate: ${dueDate.toISOString()}`);
      console.log(`🔔 AlertDate: ${alertDate.toISOString()}`);
      console.log(`🕒 Today: ${today.toISOString()}`);
      console.log(`🛑 LastAlert: ${doc.lastAlert}`);

      const lastAlert = doc.lastAlert ? new Date(doc.lastAlert) : null;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);

      if (
        (lastAlert === null && alertDate.getTime() <= dueDate) ||
        (lastAlert !== null && lastAlert.getTime() < oneWeekAgo.getTime())
      ) {
        console.log(`✅ Enviando alerta para ${doc.email}`);
        sendEmailAlert(doc);

        // Atualizar `lastAlert` no banco
        db.run(
          "UPDATE documents SET lastAlert = ? WHERE id = ?",
          [today.toISOString().split("T")[0], doc.id],
          (updateErr) => {
            if (updateErr)
              console.error(
                `Erro ao atualizar lastAlert para ${doc.id}:`,
                updateErr
              );
          }
        );
      } else {
        console.log(`❌ Nenhum alerta enviado para ID ${doc.id}`);
      }
    });
  });
});

function sendEmailAlert(doc) {
  const emailList = doc.email.split(",").map((email) => email.trim()); // Divide os emails e remove espaços extras

  const mailOptions = {
    from: "rodrigodosreissilva471@gmail.com",
    to: emailList, // O Nodemailer aceita um array de emails
    subject: `Alerta: Documento "${doc.docName}"`,
    text: `Olá, "${doc.nameResp}" \n\n 
    Este é um alerta referente ao documento "${doc.docName}" da unidade "${doc.unidadeName}".\n
    O alerta foi enviado com base no período escolhido: ${doc.period}.\n
    Por favor, verifique a situação do documento.\n\n
    Atenciosamente,\n
    Sistema de Gerenciamento de Documentos`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`Erro ao enviar email para ${emailList.join(", ")}:`, err);
    } else {
      console.log(`Email enviado para: ${emailList.join(", ")}`);
    }
  });
}

/*Ajustar sendEmailAlert

function sendEmailAlert(doc) {
  const mailOptions = {
    from: "rodrigodosreissilva471@gmail.com",
    to: doc.email,
    subject: `Alerta: Documento "${doc.docName}" vence em breve`,
    text: `Olá ${doc.nameResp},\n\n
        O documento "${doc.docName}" da unidade "${
      doc.unidadeName
    }  " vence em ${new Date(doc.dueDate).toLocaleDateString()}.\n
        Este alerta foi enviado pois você escolheu um período de ${
          doc.period
        }.\n
        Por favor, verifique a situação do documento.\n\n
        Atenciosamente,\n
        Sistema de Gerenciamento de Documentos`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`Erro ao enviar email para ${doc.email}:`, err);
    } else {
      console.log(`Email enviado para ${doc.email}:`, info.response);
    }
  });
}*/

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
