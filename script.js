const form = document.getElementById("documentForm");
const documentList = document.getElementById("documentList");

// Adiciona evento de envio do formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const docName = document.getElementById("docName").value;
  const dueDate = document.getElementById("dueDate").value;

  // Envia os dados para o backend
  const response = await fetch("http://localhost:3000/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: docName, dueDate }),
  });

  if (response.ok) {
    alert("Documento cadastrado com sucesso!");
    loadDocuments();
    form.reset();
  } else {
    alert("Erro ao cadastrar documento!");
  }
});

// Função para carregar documentos
async function loadDocuments() {
  const response = await fetch("http://localhost:3000/documents");
  const documents = await response.json();

  // Atualiza a lista de documentos
  documentList.innerHTML = documents
    .map(
      (doc) => `
    <tr>
      <td>${doc.name}</td>
      <td>${formatDate(doc.dueDate)}</td>
      <td>
        <button onclick="editDocument(${doc.id}, '${doc.name}', '${doc.dueDate}')">✏️ Editar</button>
        <button onclick="deleteDocument(${doc.id})">🗑️ Excluir</button>
      </td>
    </tr>`
    )
    .join("");
}
function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00"); // Forçar horário zero UTC
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" }); // Ajustar para o fuso correto
}
//Função para editar um documento
function editDocument(id, currentName, currentDueDate) {
  const newName = prompt("Novo nome do documento:", currentName);
  const newDueDate = prompt("Nova data de vencimento (AAAA-MM-DD):", currentDueDate);

  if (newName && newDueDate) {
    fetch(`http://localhost:3000/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, dueDate: newDueDate }),
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
    fetch(`http://localhost:3000/documents/${id}`, { method: "DELETE" }).then((response) => {
      if (response.ok) {
        alert("Documento excluído com sucesso!");
        loadDocuments();
      } else {
        alert("Erro ao excluir documento.");
      }
    });
  }
}



// Carrega os documentos ao iniciar
loadDocuments();
