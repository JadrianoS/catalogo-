require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

app.use(cors());

const PORT = 3000;
const TAGPLUS_URL = 'https://novoapp.tagplus.com.br/api/produtos';
const TOKEN = process.env.TAGPLUS_TOKEN;

// CACHE
let cacheProdutos = null;
let cacheTempo = null;
const CACHE_DURACAO = 1000 * 60 * 5; // 5 minutos

// FUNÇÃO BUSCAR PRODUTOS
async function buscarProdutosTagPlus() {

    try {

        console.log("Buscando produtos da TagPlus...");

        const response = await fetch(TAGPLUS_URL, {

            headers: {
                Authorization: `Bearer ${TOKEN}`,
                Accept: 'application/json'
            },
            timeout: 10000
        });

        if (!response.ok)
            throw new Error(`Erro TagPlus: ${response.status}`);

        const data = await response.json();

        cacheProdutos = data;
        cacheTempo = Date.now();

        console.log("Produtos sincronizados com sucesso");

        return data;

    } catch (error) {

        console.error("Erro ao sincronizar:", error.message);

        if (cacheProdutos)
            return cacheProdutos;

        throw error;

    }

}

// ROTA PRODUTOS
app.get('/produtos', async (req, res) => {

    try {

        const agora = Date.now();

        // usa cache se válido
        if (cacheProdutos && (agora - cacheTempo < CACHE_DURACAO)) {

            console.log("Usando cache");

            return res.json(cacheProdutos);

        }

        const produtos = await buscarProdutosTagPlus();

        res.json(produtos);

    } catch (error) {

        res.status(500).json({

            erro: "Erro ao buscar produtos",
            detalhe: error.message

        });

    }

});

// ROTA STATUS
app.get('/status', (req, res) => {

    res.json({

        status: "online",
        cache: cacheProdutos ? "ativo" : "vazio",
        ultimaAtualizacao: cacheTempo

    });

});

// SINCRONIZAÇÃO AUTOMÁTICA
setInterval(() => {

    buscarProdutosTagPlus();

}, CACHE_DURACAO);

// INICIAR
app.listen(PORT, () => {

    console.log(`Servidor rodando em http://localhost:${PORT}`);

});