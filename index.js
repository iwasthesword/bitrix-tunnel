const express = require("express");
const qs = require("qs");
const https = require("https");
const http = require("http");
const basicAuth = require("express-basic-auth");
require("dotenv").config();
const appAPIport = process.env.API_PORT;
const bitrixApiURL = process.env.BITRIX_API_URL;
const wpApiURL = process.env.WORDPRESS_API_URL;
const wpApiFOLDER = process.env.WORDPRESS_API_FOLDER;
const wpApiUSER = process.env.WP_API_USERNAME;
const wpApiSECRET = process.env.WP_API_SECRET;
const msgApiURL = process.env.MESSENGER_API_URL;
const msgNO = process.env.MESSENGER_API_NUMBER;

const app = express();

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
            "A Interlaser / Predileta está sempre em busca de ferramentas para deixar seus clientes cada vez mais independentes em relação ao sucesso do seu negócio. Por isso estamos lhe enviando um acesso a nossa mais nova plataforma de conteúdos.\\nO que seria essa plataforma?\\nÉ um ambiente on-line, repleto de vídeos/dicas/ receitas com as dúvidas mais frequentes que vocês, nossos clientes têm quando recebem seu equipamento:\\n- Montagem da máquina;\\n- Como operar a sua masseira;\\n- Receitas com nosso Cheffs oficiais;\\n- Além, de dicas da assistência técnica\\n\\nSegue seu login e senha para ir tendo uma familiaridade com seu equipamento enquanto aguarda a entrega pela transportadora:\\n\\n\\nhttps://ead.interlasermaquinas.com.br/\\n\\nLogin: " +
              username +
              "\\nSenha: " +
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
      "*Erro* tentando adicionar usuario:\\nHá campos faltando do contato (ID " +
        dealID +
        ")\\n\\n*Campos*: " +
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
