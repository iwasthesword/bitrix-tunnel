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

app.all("/wp/add/user/:name/:email/:cpf", (req, res) => {
  console.log(req.params);

  let username = req.params.cpf.replace(/\D/g, "");
  let name = req.params.name;
  let email = req.params.email;
  let password = username.substring(0, 6);
  const requestData = JSON.stringify({
    username: username,
    name: name,
    first_name: name,
    email: email,
    password: password,
  }).replace(/[\u007F-\uFFFF]/g, function (chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
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
          "*Erro* tentando adicionar usuario:\\n" +
            json.message +
            "\\n\\n*Nome*: " +
            name +
            "\\n*DOC*: " +
            username
        );
      } else {
        message(
          msgNO,
          "Usuario adicionado!\\n*Nome*: " + name + "\\n*DOC*: " + username
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
});

app.listen(appAPIport, () => {
  console.log(`API is running on port ${appAPIport}`);
});

function message(phone, message) {
  http
    .get(msgApiURL + "?number=" + phone + "&message=" + message, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => console.log(data));
    })
    .on("error", (error) => console.error(error));
}
