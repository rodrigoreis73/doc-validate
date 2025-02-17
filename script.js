const form = document.getElementById("documentForm");
const documentList = document.getElementById("documentList");

// Adiciona evento de envio do formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const unidadeName = document.getElementById("unidadeName").value;
  const docName = document.getElementById("docName").value;
  const typeDoc = document.getElementById("typeDoc").value;
  const dueDate = document.getElementById("dueDate").value;
  const nameResp = document.getElementById("nameResp").value;
  const email = document.getElementById("email").value;
  const period = document.getElementById("period").value;

  // Envia os dados para o backend com a propriedade correta "unidadeName"
  const response = await fetch("http://localhost:3000/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unidadeName,
      docName,
      typeDoc,
      dueDate,
      nameResp,
      email,
      period,
    }),
  });

  if (response.ok) {
    alert("Documento cadastrado com sucesso!");
    loadDocuments();
    form.reset();
  } else {
    const errorMessage = await response.text();
    console.error("Erro no cadastro:", response.status, errorMessage);
    alert("Erro ao cadastrar documento!");
  }
});

// Função para carregar documentos
async function loadDocuments() {
  const response = await fetch("http://localhost:3000/documents");
  const documents = await response.json();

  // Atualiza a lista de documentos
  documentList.innerHTML = documents
    .map((doc) => {
      return `
      <tr>
        <td>${formatDate(doc.dueDate)}</td>   <!-- Data de Vencimento -->
        <td>${doc.unidadeName}</td>          <!-- Unidade -->
        <td>${doc.docName}</td>              <!-- Nome do Documento -->
        <td>${doc.nameResp}</td>             <!-- Nome Responsável -->
        <td>${doc.email}</td>                <!-- Email Alerta -->
        <td>${doc.period}</td>               <!-- Período -->
        <td>${
          doc.typeDoc
        }</td>              <!-- Tipo de Documento (se quiser exibir) -->

        <td>
          <button onclick="editDocument(
            ${doc.id},
            '${doc.unidadeName}',
            '${doc.docName}',
            '${doc.typeDoc}',
            '${doc.dueDate}',
            '${doc.nameResp}',
            '${doc.email}',
            '${doc.period}'
          )">
    ✏️ Editar
          </button>
            <button onclick="deleteDocument(${doc.id})">🗑️ Excluir</button>
          </td>

    `;
    })
    .join("");
}

function formatDate(dateValue) {
  // Se vier "2025-02-17" ou um objeto Date, isso normalmente funciona bem
  const date = new Date(dateValue);

  // Se ainda assim for inválido, retorne algo amigável
  if (isNaN(date.getTime())) {
    return "Data Inválida";
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

//Função para editar um documento
// Função para editar um documento
function editDocument(
  id,
  currentUnidadeName,
  currentDocName,
  currentTypeDoc,
  currentDueDate,
  currentNameResp,
  currentEmail,
  currentPeriod
) {
  // Formatar a data para YYYY-MM-DD se ela estiver no formato ISO
  let formattedDueDate = currentDueDate.includes("T")
    ? currentDueDate.split("T")[0]
    : currentDueDate;

  const newUnidadeName = prompt("Nova unidade:", currentUnidadeName);
  const newDocName = prompt("Novo nome do documento:", currentDocName);
  const newTypeDoc = prompt("Novo tipo de documento:", currentTypeDoc);
  const newDueDate = prompt(
    "Nova data de vencimento (AAAA-MM-DD):",
    formattedDueDate
  );
  const newNameResp = prompt("Novo responsável:", currentNameResp);
  const newEmail = prompt("Novo email:", currentEmail);
  const newPeriod = prompt("Novo período:", currentPeriod);

  if (newDocName && newDueDate) {
    fetch(`http://localhost:3000/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unidadeName: newUnidadeName,
        docName: newDocName,
        typeDoc: newTypeDoc,
        dueDate: newDueDate, // A data já está no formato correto
        nameResp: newNameResp,
        email: newEmail,
        period: newPeriod,
      }),
    }).then((response) => {
      if (response.ok) {
        alert("Documento atualizado com sucesso!");
        loadDocuments();
      } else {
        alert("Erro ao atualizar documento.");
      }
    });
  }
}

//função para deletar documento
function deleteDocument(id) {
  if (confirm("Tem certeza que deseja excluir este documento?")) {
    fetch(`http://localhost:3000/documents/${id}`, { method: "DELETE" }).then(
      (response) => {
        if (response.ok) {
          alert("Documento excluído com sucesso!");
          loadDocuments();
        } else {
          alert("Erro ao excluir documento.");
        }
      }
    );
  }
}

// Carrega os documentos ao iniciar
loadDocuments();
