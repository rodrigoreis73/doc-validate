// server.js
const express = require("express");
//const mysql = require("mysql");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Configuração da conexão com o MySQL
const connection = mysql.createConnection({
  host: "10.10.0.22",
  user: "root",
  password: "fyi2cYyFXOVUrUf21wXq6Bz5MkeMwR", // substitua pela sua senha
  database: "documents_db", // certifique-se de que este banco de dados existe
});

connection.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    return;
  }
  console.log("Conectado ao MySQL");

  // Cria a tabela 'documents' se ela não existir
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unidadeName VARCHAR(255),
      docName VARCHAR(255),
      typeDoc VARCHAR(255),
      dueDate DATE,
      nameResp VARCHAR(255),
      email VARCHAR(255),
      period VARCHAR(255),
      lastAlert DATE
    )
  `;
  connection.query(createTableQuery, (err) => {
    if (err) console.error("Erro ao criar tabela:", err);
    else console.log("Tabela 'documents' pronta");
  });
});

// Endpoint para cadastrar documento
app.post("/documents", (req, res) => {
  const { unidadeName, docName, typeDoc, dueDate, nameResp, email, period } =
    req.body;
  const query = `
    INSERT INTO documents (unidadeName, docName, typeDoc, dueDate, nameResp, email, period)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  connection.query(
    query,
    [unidadeName, docName, typeDoc, dueDate, nameResp, email, period],
    (err) => {
      if (err) {
        console.error("Erro ao salvar documento:", err);
        return res.status(500).send("Erro ao salvar documento.");
      }
      res.status(200).send("Documento cadastrado!");
    }
  );
});

// Endpoint para listar documentos
app.get("/documents", (req, res) => {
  connection.query("SELECT * FROM documents", (err, results) => {
    if (err) return res.status(500).send("Erro ao listar documentos.");

    // Converter dueDate para YYYY-MM-DD
    results.forEach((doc) => {
      if (doc.dueDate instanceof Date) {
        doc.dueDate = doc.dueDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
      }
    });

    res.json(results);
  });
});

// Endpoint para atualizar documento
app.put("/documents/:id", (req, res) => {
  const { id } = req.params;
  const { unidadeName, docName, typeDoc, dueDate, nameResp, email, period } =
    req.body;

  // Busca o documento atual para verificar se a dueDate foi alterada
  const selectQuery = "SELECT dueDate FROM documents WHERE id = ?";
  connection.query(selectQuery, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar documento:", err);
      return res.status(500).send("Erro ao buscar documento.");
    }
    if (results.length === 0) {
      return res.status(404).send("Documento não encontrado.");
    }

    // Converte a dueDate atual para o formato 'YYYY-MM-DD'
    const currentDueDate = results[0].dueDate
      ? results[0].dueDate.toISOString().split("T")[0]
      : null;
    const dueDateChanged = currentDueDate !== dueDate;

    let updateQuery;
    let params;

    if (dueDateChanged) {
      updateQuery = `
        UPDATE documents 
        SET unidadeName = ?, docName = ?, typeDoc = ?, dueDate = ?, nameResp = ?, email = ?, period = ?, lastAlert = NULL
        WHERE id = ?
      `;
      params = [
        unidadeName,
        docName,
        typeDoc,
        dueDate,
        nameResp,
        email,
        period,
        id,
      ];
    } else {
      updateQuery = `
        UPDATE documents 
        SET unidadeName = ?, docName = ?, typeDoc = ?, dueDate = ?, nameResp = ?, email = ?, period = ?
        WHERE id = ?
      `;
      params = [
        unidadeName,
        docName,
        typeDoc,
        dueDate,
        nameResp,
        email,
        period,
        id,
      ];
    }

    connection.query(updateQuery, params, (err) => {
      if (err) {
        console.error("Erro ao atualizar documento:", err);
        return res.status(500).send("Erro ao atualizar documento.");
      }
      res.status(200).send("Documento atualizado com sucesso!");
    });
  });
});

// Endpoint para excluir documento
app.delete("/documents/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM documents WHERE id = ?";
  connection.query(query, [id], (err) => {
    if (err) {
      console.error("Erro ao excluir documento:", err);
      return res.status(500).send("Erro ao excluir documento.");
    }
    res.status(200).send("Documento excluído com sucesso!");
  });
});

// Configuração do transporte de e-mails com Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rodrigodosreissilva471@gmail.com",
    pass: "ftyteorxgiikprys", // Use uma senha de app para maior segurança
  },
});

// Cron job para checar e enviar alertas (executa a cada minuto)
cron.schedule("* * * * *", () => {
  console.log("Verificando documentos para envio de alerta...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const query = "SELECT * FROM documents";
  connection.query(query, (err, rows) => {
    if (err) {
      console.error("Erro ao buscar documentos:", err);
      return;
    }

    rows.forEach((doc) => {
      const alertDaysMatch = doc.period.match(/\d+/);
      const alertDays = alertDaysMatch ? parseInt(alertDaysMatch[0]) : 0;
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
        //(lastAlert === null && alertDate.getTime() <= dueDate.getTime()) ||
        (lastAlert === null && today.getTime() >= alertDate.getTime()) ||
        (lastAlert !== null && lastAlert.getTime() < oneWeekAgo.getTime())
      ) {
        console.log(`✅ Enviando alerta para ${doc.email}`);
        sendEmailAlert(doc);

        // Atualiza o lastAlert no banco
        const updateQuery = "UPDATE documents SET lastAlert = ? WHERE id = ?";
        const lastAlertDate = today.toISOString().split("T")[0];
        connection.query(updateQuery, [lastAlertDate, doc.id], (err) => {
          if (err) {
            console.error(`Erro ao atualizar lastAlert para ${doc.id}:`, err);
          }
        });
      } else {
        console.log(`❌ Nenhum alerta enviado para ID ${doc.id}`);
      }
    });
  });
});

function sendEmailAlert(doc) {
  const emailList = doc.email.split(",").map((email) => email.trim());
  const mailOptions = {
    from: "rodrigodosreissilva471@gmail.com",
    to: emailList,
    subject: `Alerta: Documento "${doc.docName}"`,
    text: `Olá, "${doc.nameResp}"\n\nEste é um alerta referente ao documento "${doc.docName}" da unidade "${doc.unidadeName}".\nO alerta foi enviado com base no período escolhido: ${doc.period}.\nPor favor, verifique a situação do documento.\n\nAtenciosamente,\nSistema de Gerenciamento de Documentos`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`Erro ao enviar email para ${emailList.join(", ")}:`, err);
    } else {
      console.log(`Email enviado para: ${emailList.join(", ")}`);
    }
  });
}

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
