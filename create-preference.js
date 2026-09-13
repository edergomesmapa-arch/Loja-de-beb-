    const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    const { items, endereco } = JSON.parse(event.body);

    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Carrinho vazio' })
      };
    }

    if (!endereco) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Endereço não informado' })
      };
    }

    const preference = new Preference(client);

    const body = {
      items: items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: Number(item.price)
      })),
      metadata: {
        nome_cliente: endereco.nome,
        cep: endereco.cep,
        rua: endereco.rua,
        numero: endereco.numero,
        complemento: endereco.complemento || '',
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        telefone: endereco.telefone
      },
      back_urls: {
        success: "https://shimmering-trifle-d21f43.netlify.app/pagamento-sucesso.html",
        failure: "https://shimmering-trifle-d21f43.netlify.app/pagamento-erro.html",
        pending: "https://shimmering-trifle-d21f43.netlify.app/pagamento-pendente.html"
      }
    };

    const result = await preference.create({ body });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: result.id, init_point: result.init_point })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
  
