const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.static('public'));

const TOKEN = 'rLu3ssnVmsSNXfNnFLVwUxS5AUwUpAbBrS';

// Rota para buscar produtos
app.get('/api/produtos', async (req, res) => {

    try {

        const response = await fetch('https://novoapp.tagplus.com.br/api/v1/produtos', {
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Accept': 'application/json'
            }
        });

        const texto = await response.text();

        // evita erro JSON inválido
        try {
            const json = JSON.parse(texto);
            res.json(json);
        } catch {
            res.json({ erro: "Resposta não é JSON", resposta: texto });
        }

    } catch (erro) {

        res.json({ erro: erro.message });

    }

});

app.listen(3000, () => {
    console.log('Catálogo rodando em http://localhost:3000');
});