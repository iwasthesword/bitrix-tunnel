const express = require("express");
const qs = require("qs");
const https = require("https");
const basicAuth = require("express-basic-auth");
require("dotenv").config();
const appAPIport = process.env.API_PORT;
const bitrixApiURL = process.env.BITRIX_API_URL;
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
  let phone = parameters["FIELDS"]["PHONE"][0]["VALUE"];
  //if (phone.substring(0, 2) === "55") {
  ddd = phone.substring(0, 2);
  //}
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

app.listen(appAPIport, () => {
  console.log(`API is running on port ${appAPIport}`);
});
