const express = require("express");
const qs = require("qs");
const https = require("https");
const http = require("http");
const basicAuth = require("express-basic-auth");
require("dotenv").config();
const appAPIport = process.env.API_PORT;
const bitrixApiURL = process.env.BITRIX_API_URL;
const bitrixApiKey = process.env.BITRIX_API_KEY;
const wpApiURL = process.env.WORDPRESS_API_URL;
const wpApiFOLDER = process.env.WORDPRESS_API_FOLDER;
const wpApiUSER = process.env.WP_API_USERNAME;
const wpApiSECRET = process.env.WP_API_SECRET;
const msgApiURL = process.env.MESSENGER_API_URL;
const msgNO = process.env.MESSENGER_API_NUMBER;

const app = express();

function getRandomLetter() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

app.use(
  basicAuth({
    users: { [process.env.API_USERNAME]: process.env.API_PASSWORD },
    challenge: true,
    unauthorizedResponse: "Authentication failed.",
  })
);

app.get("/rest/1/:bitAPI/crm.lead.add.json", (req, res) => {
  var parameters = req.query; // Get all query parameters
  let ddd = "";
  let phone = parameters["FIELDS"]["PHONE"][0]["VALUE"].replace(/\D/g, "");
  if (phone.substring(0, 2) === "55") {
    ddd = phone.substring(2, 4);
  }
  console.log(phone);
  parameters["FIELDS"]["UF_CRM_1687526938"] = ddd;
  const fields = { FIELDS: parameters["FIELDS"] };
  const paramString = qs.stringify(fields, { indices: true });
  const bitAPI = req.params.bitAPI;

  const bitrixCall =
    "https://" +
    bitrixApiURL +
    "/rest/1/" +
    bitAPI +
    "/crm.lead.add.json?" +
    paramString;

  https
    .get(bitrixCall, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        res.send("Success.");
      });
    })
    .on("error", (error) => {
      res.send("Error making the GET request:", error);
    });
});

app.all("/bitrix/add/comment", (req, res) => {
  let id = req.query.id;
  let comment = req.query.comment;

  res.json(add_deal_comment(id, comment));
});

app.all("/wp/add/user/", (req, res) => {
  let username = req.query.doc;
  let name = req.query.name;
  let email = req.query.email;
  let password = "";
  let phone = req.query.phone;
  let dealID = req.query.id;

  if (username && name && email && phone) {
    username = username.replace(/\D/g, "");
    phone = phone.replace(/\D/g, "");
    password = username.slice(-6);
    // Add a random letter at the beginning
    password = getRandomLetter() + password;

    // Add three random letters at the end
    for (let i = 0; i < 3; i++) {
      password += getRandomLetter();
    }

    if (phone.substring(0, 2) !== "55") {
      phone = "55" + phone;
    }

    const requestData = JSON.stringify({
      username: username,
      name: name,
      first_name: name,
      email: email,
      password: password,
      description: phone,
    }).replace(/[\u007F-\uFFFF]/g, function (chr) {
      return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substring(-4);
    });

    // Request options
    const options = {
      hostname: wpApiURL,
      path: wpApiFOLDER + "/wp-json/wp/v2/users",
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(wpApiUSER + ":" + wpApiSECRET).toString("base64"),
        "Content-Type": "application/json",
        "Content-Length": requestData.length,
      },
      rejectUnauthorized: false,
    };

    // Create the request
    const request = https.request(options, (response) => {
      let responseBody = "";

      // Concatenate response chunks
      response.on("data", (chunk) => {
        responseBody += chunk;
      });

      // Process response
      response.on("end", () => {
        let json = JSON.parse(responseBody);
        console.log(requestData);
        console.log(responseBody);
        if (json.hasOwnProperty("code")) {
          message(
            msgNO,
            "*Erro* tentando adicionar usuario (ID " +
              dealID +
              "):\\n" +
              json.message
          );
        } else {
          message(
            phone,
            `Olá, cliente! \\n
\\n
🎉 Parabéns pela sua compra! \\n
\\n
A Interlaser e Predileta, marcas do Grupo Seven, estão sempre à procura de maneiras para tornar sua jornada de sucesso mais fácil e bem-sucedida.\\n
\\n
E agora temos uma novidade incrível para você:\\n
\\n
Apresentamos a nossa plataforma exclusiva repleta de conteúdos incríveis:\\n
\\n
📹 Vídeos práticos;\\n
💡 Dicas essenciais;\\n
🍽 Receitas deliciosas de chefes parceiros;\\n
🔧 Dicas de assistência técnica;\\n
❓ Respostas para as dúvidas mais frequentes;\\n
\\n
E muito mais.\\n
\\n
Tudo o que você precisa para aproveitar ao máximo seus equipamentos. Desde a montagem até as dicas de receitas incríveis.\\n
\\n
E para você começar imediatamente, aqui estão o seu usuario e senha.\\n
*Usuario*: ${username}\\n
*Senha*: ${password} \\n
\\n
Comece a explorar antes mesmo da entrega da sua máquina pela transportadora. \\n
📦 🚚💨\\n
\\n
Tenha uma experiência incrível rumo ao sucesso com a Interlaser e Predileta!\\n
\\n
https://ead.interlasermaquinas.com.br/`
          );
          add_deal_comment(
            dealID,
            "Conta criada no EAD:\nUsuario: " +
              username +
              "\nSenha: " +
              password
          );
        }
        res.json(responseBody);
      });
    });

    // Handle errors
    request.on("error", (error) => {
      console.error("Error:", error);
    });

    // Send the request data
    request.write(requestData);

    // End the request
    request.end();
  } else {
    console.log(req.query);
    let campos = "";
    if (!name) campos += "Nome,";
    if (!username) campos += "CPF/CNPJ,";
    if (!email) campos += "E-mail,";
    if (!phone) campos += "Telefone,";
    message(
      msgNO,
      "*Erro* tentando adicionar usuario (ID " +
        dealID +
        "):\\nHá campos faltando do contato\\n\\n*Campos*: " +
        campos
    );
    res.json({ error: "Há campos faltando do contato. Campos: " + campos });
  }
});

app.listen(appAPIport, () => {
  console.log(`API is running on port ${appAPIport}`);
});

function message(phone, msg) {
  http
    .get(msgApiURL + "?number=" + phone + "&message=" + msg, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let obj = JSON.parse(data);
        console.log(data);
        if (obj.error) {
          message(
            msgNO,
            "Erro ao mandar mensagem para o numero: " +
              phone +
              "\\nMensagem: " +
              msg
          );
        } else {
          console.log(data);
        }
      });
    })
    .on("error", (error) => console.error(error));
}

function add_deal_comment(id, comment) {
  const data = JSON.stringify({
    fields: {
      ENTITY_ID: id,
      ENTITY_TYPE: "deal",
      COMMENT: comment,
    },
  });

  const requestOptions = {
    hostname: bitrixApiURL, // Replace with the target hostname
    path: "/rest/1/" + bitrixApiKey + "/crm.timeline.comment.add", // Replace with the target API endpoint path
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
    body: data, // Pass the JSON body directly in requestOptions
  };

  const req = https.request(requestOptions, (res) => {
    //console.log(`Status Code: ${res.statusCode}`);

    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      //console.log("Response:", responseData);
    });
  });

  req.on("error", (error) => {
    console.error("Bitrix comment add error:", error);
  });

  req.end(requestOptions.body); // Send the body with the request
}
