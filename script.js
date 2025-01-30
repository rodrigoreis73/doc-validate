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
      <td>${new Date(doc.dueDate).toLocaleDateString()}</td>
    </tr>`
    )
    .join("");
}

// Carrega os documentos ao iniciar
loadDocuments();
