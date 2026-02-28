const CONFIG = {
    apiUrl: 'http://localhost:3000/produtos', // chama seu backend
    whatsapp: '5583999932096',
    minimoAtacado: 10,
    descontoAtacado: 0.10,
    desconto50: 0.05,
    desconto100: 0.10
};

const estado = {
    usuario: null,
    produtos: [],
    carrinho: [],
    pedidos: [],
    telaAtual: 'tela-login'
};

function showTela(id) {
    document.querySelectorAll('.tela').forEach(t => {
        t.classList.remove('ativa');
        t.hidden = true;
    });
    const tela = document.getElementById(id);
    if (tela) {
        tela.classList.add('ativa');
        tela.hidden = false;
        estado.telaAtual = id;
    }
}

function toast(mensagem, tipo = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = mensagem;
    el.className = 'toast ' + (tipo || '');
    el.hidden = false;
    setTimeout(() => {
        el.hidden = true;
    }, 3000);
}

function precoUnitario(produto) {
    return Number(produto.valorVenda) || 0;
}

function precoAtacado(produto, qtd) {
    const base = precoUnitario(produto);
    if (qtd >= 100) return base * (1 - CONFIG.descontoAtacado - CONFIG.desconto100);
    if (qtd >= 50) return base * (1 - CONFIG.descontoAtacado - CONFIG.desconto50);
    if (qtd >= CONFIG.minimoAtacado) return base * (1 - CONFIG.descontoAtacado);
    return base;
}

function precoAtacadoUnitario(produto) {
    return precoAtacado(produto, CONFIG.minimoAtacado);
}

var BASE_URL_IMAGEM = 'https://novoapp.tagplus.com.br';

function fotoProduto(produto) {
    // TagPlus e variações: imagem, url_imagem, foto, imagens[], midias[], fotoPrincipal
    const img =
        produto.imagem ||
        produto.url_imagem ||
        produto.urlImagem ||
        produto.foto ||
        produto.fotoPrincipal ||
        produto.imagem_principal ||
        (produto.imagens && produto.imagens[0] && (produto.imagens[0].url || produto.imagens[0].link)) ||
        (produto.midias && produto.midias[0] && (produto.midias[0].url || produto.midias[0].link));
    if (!img || typeof img !== 'string' || img.trim() === '') return 'https://via.placeholder.com/400x400?text=Sem+imagem';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    // Caminho relativo: completar com a base da API
    var path = img.startsWith('/') ? img : '/' + img;
    return BASE_URL_IMAGEM + path;
}

function initLogin() {
    const form = document.getElementById('form-login');
    const entrarSemLogin = document.getElementById('entrar-sem-login');
    const btnWhatsapp = document.getElementById('btn-whatsapp');

    form && form.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        if (!email || !senha) {
            toast('Preencha e-mail e senha.', 'erro');
            return;
        }
        estado.usuario = { email };
        toast('Entrada realizada.', 'sucesso');
        showTela('tela-catalogo');
        carregarCatalogo();
    });

    entrarSemLogin && entrarSemLogin.addEventListener('click', function () {
        estado.usuario = null;
        showTela('tela-catalogo');
        carregarCatalogo();
    });

    const waUrl = 'https://wa.me/' + CONFIG.whatsapp;
    btnWhatsapp && btnWhatsapp.addEventListener('click', function (e) {
        e.preventDefault();
        window.open(waUrl, '_blank');
    });
}

async function carregarCatalogo() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    container.innerHTML = '<p class="loading">Carregando produtos...</p>';

    try {
        const response = await fetch(CONFIG.apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.token,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        const dados = await response.json();
        estado.produtos = Array.isArray(dados) ? dados : (dados.data || dados.produtos || []);
        renderCatalogo();
        atualizarBadgeCarrinho();
    } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        var msg = err.message || 'Erro de rede';
        container.innerHTML = '<div class="vazio erro-api">' +
            '<p><strong>Não foi possível carregar os produtos.</strong></p>' +
            '<p class="texto-erro">' + msg + '</p>' +
            '<p class="dica">Dica: abra o site por um <strong>servidor local</strong> (não pelo arquivo duplo-clique). No VS Code: clique com o botão direito em index.html → "Open with Live Server". Ou no terminal: <code>npx serve</code></p>' +
            '<button type="button" class="btn btn-primario" id="btn-tentar-novamente">Tentar novamente</button>' +
            '</div>';
        document.getElementById('btn-tentar-novamente')?.addEventListener('click', carregarCatalogo);
    }
}

function filtrarOrdenar() {
    const busca = (document.getElementById('busca')?.value || '').toLowerCase();
    const ordem = document.getElementById('filtro-ordem')?.value || 'nome';
    let lista = estado.produtos.filter(p => {
        const nome = (p.descricao || p.nome || '').toLowerCase();
        const codigo = (p.codigo || '').toLowerCase();
        return nome.includes(busca) || codigo.includes(busca);
    });

    if (ordem === 'preco') {
        lista = [...lista].sort((a, b) => precoUnitario(a) - precoUnitario(b));
    } else if (ordem === 'preco-desc') {
        lista = [...lista].sort((a, b) => precoUnitario(b) - precoUnitario(a));
    } else {
        lista = [...lista].sort((a, b) =>
            (a.descricao || a.nome || '').localeCompare(b.descricao || b.nome || '')
        );
    }
    return lista;
}

function renderCatalogo() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const lista = filtrarOrdenar();
    if (lista.length === 0) {
        container.innerHTML = '<p class="vazio">Nenhum produto encontrado.</p>';
        return;
    }

    container.innerHTML = lista.map((p, idx) => {
        const id = p.id ?? p.codigo ?? 'p' + idx;
        const nome = p.descricao || p.nome || 'Produto';
        const preco = precoUnitario(p);
        const precoAtac = precoAtacadoUnitario(p);
        const img = fotoProduto(p);
        const safeId = String(id).replace(/"/g, '');
        const safeNome = nome.replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return `
          <article class="card-produto">
            <a href="#detalhe" class="card-produto-link" data-index="${idx}" data-id="${safeId}">
              <img src="${img}" alt="${safeNome}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=Sem+imagem'">
              <h3>${safeNome}</h3>
              <p class="preco">R$ ${preco.toFixed(2)}</p>
              <p class="atacado">Atacado (mín. ${CONFIG.minimoAtacado} un.): R$ ${precoAtac.toFixed(2)}/un.</p>
            </a>
            <button type="button" class="btn btn-primario btn-add-card" data-index="${idx}">Adicionar ao carrinho</button>
          </article>`;
    }).join('');

    container.querySelectorAll('.card-produto-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const idx = parseInt(this.getAttribute('data-index'), 10);
            const listaAtual = filtrarOrdenar();
            const p = listaAtual[idx];
            if (p) abrirDetalhe(p);
        });
    });

    container.querySelectorAll('.btn-add-card').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const idx = parseInt(this.getAttribute('data-index'), 10);
            const listaAtual = filtrarOrdenar();
            const p = listaAtual[idx];
            if (p) {
                adicionarAoCarrinho(p, CONFIG.minimoAtacado);
                toast('Adicionado ao carrinho (' + CONFIG.minimoAtacado + ' un.)', 'sucesso');
                atualizarBadgeCarrinho();
            }
        });
    });
}

function abrirDetalhe(produto) {
    estado.produtoAtual = produto;
    const main = document.getElementById('detalhe-produto');
    if (!main) return;
    const nome = produto.descricao || produto.nome || 'Produto';
    const desc = produto.descricaoCompleta || produto.observacao || produto.descricao || '';
    const preco = precoUnitario(produto);
    const precoAtac = precoAtacadoUnitario(produto);
    const img = fotoProduto(produto);

    main.innerHTML = `
      <img class="foto" src="${img}" alt="${nome}">
      <h2>${nome}</h2>
      <p class="descricao">${desc || 'Sem descrição adicional.'}</p>
      <div class="precos">
        <p class="unitario">Preço unitário: R$ ${preco.toFixed(2)}</p>
        <p class="atacado">Preço atacado (mín. ${CONFIG.minimoAtacado} un.): R$ ${precoAtac.toFixed(2)}/un.</p>
      </div>
      <p class="condicoes">
        Condição de atacado: mínimo de ${CONFIG.minimoAtacado} unidades.
        Acima de 50 un.: +5% desconto. Acima de 100 un.: +10% desconto.
      </p>
      <div class="controle-qtd">
        <label for="qtd-detalhe">Quantidade:</label>
        <input type="number" id="qtd-detalhe" min="1" value="${CONFIG.minimoAtacado}" aria-label="Quantidade">
      </div>
      <button type="button" class="btn btn-primario btn-grande" id="btn-add-carrinho">
        Adicionar ao carrinho
      </button>`;

    const btnAdd = document.getElementById('btn-add-carrinho');
    btnAdd && btnAdd.addEventListener('click', function () {
        const inputQtd = document.getElementById('qtd-detalhe');
        const qtd = Math.max(1, parseInt(inputQtd.value, 10) || 1);
        adicionarAoCarrinho(produto, qtd);
        toast('Produto adicionado ao carrinho.', 'sucesso');
        atualizarBadgeCarrinho();
    });

    showTela('tela-produto');
}

function adicionarAoCarrinho(produto, quantidade) {
    const idRef = produto.id || produto.codigo || produto.descricao;
    const existente = estado.carrinho.find(i => (i.id || i.codigo || i.descricao) === idRef);
    if (existente) {
        existente.quantidade += quantidade;
    } else {
        estado.carrinho.push({ ...produto, quantidade });
    }
}

function atualizarBadgeCarrinho() {
    const total = estado.carrinho.reduce((s, i) => s + i.quantidade, 0);
    const badge = document.getElementById('badge-carrinho');
    if (badge) badge.textContent = total;
}

function renderCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const resumo = document.getElementById('resumo-carrinho');
    const btnIrFinalizar = document.getElementById('btn-ir-finalizar');
    if (!lista || !resumo || !btnIrFinalizar) return;

    if (estado.carrinho.length === 0) {
        lista.innerHTML = '<p class="vazio">Seu carrinho está vazio.</p>';
        resumo.innerHTML = '';
        btnIrFinalizar.style.display = 'none';
        return;
    }

    let subtotal = 0;
    let desconto = 0;
    estado.carrinho.forEach(item => {
        const preco = precoAtacado(item, item.quantidade);
        subtotal += precoUnitario(item) * item.quantidade;
        desconto += (precoUnitario(item) - preco) * item.quantidade;
    });
    const total = subtotal - desconto;

    lista.innerHTML = estado.carrinho.map(item => {
        const preco = precoAtacado(item, item.quantidade);
        const nome = item.descricao || item.nome || 'Produto';
        const id = item.id || item.codigo || item.descricao;
        return `
          <div class="item-carrinho" data-id="${id}">
            <img src="${fotoProduto(item)}" alt="">
            <div class="info">
              <h4>${nome}</h4>
              <p class="preco">R$ ${preco.toFixed(2)}/un. × ${item.quantidade} = R$ ${(preco * item.quantidade).toFixed(2)}</p>
            </div>
            <div class="qtd">
              <button type="button" aria-label="Diminuir" data-id="${id}">−</button>
              <input type="number" value="${item.quantidade}" min="1" data-id="${id}" aria-label="Quantidade de ${nome}">
              <button type="button" aria-label="Aumentar" data-id="${id}">+</button>
            </div>
          </div>`;
    }).join('');

    lista.querySelectorAll('.qtd button').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const item = estado.carrinho.find(i => (i.id || i.codigo || i.descricao) == id);
            if (!item) return;
            if (this.textContent === '−') {
                if (item.quantidade <= 1) {
                    estado.carrinho = estado.carrinho.filter(i => (i.id || i.codigo || i.descricao) != id);
                } else {
                    item.quantidade--;
                }
            } else {
                item.quantidade++;
            }
            renderCarrinho();
            atualizarBadgeCarrinho();
        });
    });

    lista.querySelectorAll('.qtd input').forEach(input => {
        input.addEventListener('change', function () {
            const id = this.getAttribute('data-id');
            const item = estado.carrinho.find(i => (i.id || i.codigo || i.descricao) == id);
            if (!item) return;
            const q = Math.max(1, parseInt(this.value, 10) || 1);
            item.quantidade = q;
            renderCarrinho();
            atualizarBadgeCarrinho();
        });
    });

    resumo.innerHTML = `
      <div class="linha"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span></div>
      ${desconto > 0 ? `<div class="linha"><span>Desconto atacado</span><span>- R$ ${desconto.toFixed(2)}</span></div>` : ''}
      <div class="linha total"><span>Total</span><span>R$ ${total.toFixed(2)}</span></div>`;
    btnIrFinalizar.style.display = 'block';
}

function initFinalizar() {
    const btnFinalizar = document.getElementById('btn-finalizar-pedido');
    btnFinalizar && btnFinalizar.addEventListener('click', function () {
        const nome = document.getElementById('finalizar-nome')?.value.trim();
        const tel = document.getElementById('finalizar-telefone')?.value.trim();
        const endereco = document.getElementById('finalizar-endereco')?.value.trim();
        const pagamento = document.querySelector('input[name="pagamento"]:checked')?.value || 'pix';
        if (!nome || !tel || !endereco) {
            toast('Preencha nome, telefone e endereço.', 'erro');
            return;
        }
        const pedido = {
            id: Date.now(),
            nome,
            telefone: tel,
            endereco,
            pagamento,
            itens: estado.carrinho.map(i => ({
                nome: i.descricao || i.nome,
                qtd: i.quantidade,
                preco: precoAtacado(i, i.quantidade)
            })),
            total: estado.carrinho.reduce((s, i) => s + precoAtacado(i, i.quantidade) * i.quantidade, 0)
        };
        estado.pedidos.push(pedido);
        estado.carrinho = [];
        atualizarBadgeCarrinho();

        const msg = encodeURIComponent(
            'Olá! Gostaria de finalizar meu pedido:\n' +
            pedido.itens.map(i => `${i.nome} x ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`).join('\n') +
            `\nTotal: R$ ${pedido.total.toFixed(2)}\nPagamento: ${pagamento}\nEndereço: ${endereco}\nNome: ${nome}\nTel: ${tel}`
        );

        toast('Pedido registrado! Abrindo WhatsApp.', 'sucesso');
        const waUrl = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + msg;
        window.open(waUrl, '_blank');
        showTela('tela-catalogo');
        carregarCatalogo();
    });
}

function renderAreaCliente() {
    const el = document.getElementById('historico-pedidos');
    if (!el) return;
    if (estado.pedidos.length === 0) {
        el.textContent = 'Você ainda não tem pedidos.';
    } else {
        el.innerHTML = estado.pedidos.map(p =>
            `<p><strong>Pedido #${p.id}</strong> – R$ ${p.total.toFixed(2)} (${p.itens.length} itens)</p>`
        ).join('');
    }
    const btnContato = document.getElementById('btn-contato-vendedor');
    if (btnContato) {
        btnContato.href = 'https://wa.me/' + CONFIG.whatsapp;
    }
}

function initEventosGlobais() {
    document.getElementById('busca')?.addEventListener('input', renderCatalogo);
    document.getElementById('filtro-ordem')?.addEventListener('change', renderCatalogo);

    document.getElementById('btn-ver-carrinho')?.addEventListener('click', function () {
        renderCarrinho();
        showTela('tela-carrinho');
    });

    document.getElementById('btn-area-cliente')?.addEventListener('click', function () {
        renderAreaCliente();
        showTela('tela-cliente');
    });

    document.getElementById('voltar-catalogo')?.addEventListener('click', () => showTela('tela-catalogo'));
    document.getElementById('voltar-carrinho')?.addEventListener('click', () => showTela('tela-catalogo'));
    document.getElementById('voltar-finalizar')?.addEventListener('click', () => {
        renderCarrinho();
        showTela('tela-carrinho');
    });
    document.getElementById('voltar-cliente')?.addEventListener('click', () => showTela('tela-catalogo'));

    document.getElementById('btn-ir-finalizar')?.addEventListener('click', function () {
        showTela('tela-finalizar');
    });
}

function init() {
    initLogin();
    initEventosGlobais();
    initFinalizar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
