// netlify/functions/create-preference.js
//
// Recebe os itens do carrinho (enviados pelo site) e cria uma "preferência de
// pagamento" no Mercado Pago. Devolve o link (init_point) para o qual o
// cliente é redirecionado para pagar com Pix ou cartão.
//
// Precisa da variável de ambiente MP_ACCESS_TOKEN configurada no Netlify
// (Site settings > Environment variables), com a Chave de Acesso (Access
// Token) da sua conta do Mercado Pago.

exports.handler = async (event) => {
  // Só aceita requisições POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          'MP_ACCESS_TOKEN não está configurado nas variáveis de ambiente do Netlify.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }),
    };
  }

  const cartItems = Array.isArray(payload.items) ? payload.items : [];

  if (cartItems.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'O carrinho está vazio.' }),
    };
  }

  // Monta a lista de itens no formato que o Mercado Pago espera.
  // Nunca confie no preço vindo do navegador em produção real — o ideal é
  // validar cada id/preço contra uma lista de produtos guardada aqui no
  // servidor. Deixei um mapa de preços "oficiais" abaixo para isso.
  const officialPrices = {
    'macacao-canelado-ml': 39.0,
    'macacao-trico-ursinho': 45.0,
    'macacao-floral-lacos': 55.0,
    'macacao-trico-cavalinho': 79.0,
    'vestido-floral-laco': 49.0,
    'kit-3pcs-ursinho': 99.0,
    'macacao-malha-touca-ursinho': 49.0,
    'macacao-bichinhos-premium': 45.0,
  };

  const items = cartItems.map((item) => {
    const unitPrice =
      officialPrices[item.id] !== undefined
        ? officialPrices[item.id]
        : Number(item.price) || 0;

    return {
      id: item.id,
      title: item.title || 'Produto Baby Aconchego',
      quantity: Number(item.quantity) || 1,
      unit_price: unitPrice,
      currency_id: 'BRL',
    };
  });

  // Base do site, usada para montar as URLs de retorno. O Netlify já
  // preenche essa variável automaticamente em cada deploy.
  const siteUrl =
    process.env.URL || process.env.DEPLOY_URL || 'https://example.netlify.app';

  const preferenceBody = {
    items,
    back_urls: {
      success: `${siteUrl}/pagamento-sucesso.html`,
      failure: `${siteUrl}/pagamento-erro.html`,
      pending: `${siteUrl}/pagamento-pendente.html`,
    },
    auto_return: 'approved',
    statement_descriptor: 'BABY ACONCHEGO',
  };

  try {
    const mpResponse = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preferenceBody),
      }
    );

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return {
        statusCode: mpResponse.status,
        body: JSON.stringify({ error: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        init_point: data.init_point,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao contactar o Mercado Pago: ' + err.message }),
    };
  }
};
