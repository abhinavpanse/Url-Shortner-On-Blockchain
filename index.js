const express = require("express");
const rp = require("request-promise");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = 5000;

app.get("/:shortid", async (req, res) => {
  const shortid = req.params.shortid;
  const shorturl = "http://localhost:5000/" + shortid;
  try {
    const data = await axios.get(
      "http://localhost:3001/address/?address=" + shorturl
    );
    const longUrl = data.data.longUrl;
    if (longUrl) return res.redirect(longUrl);
  } catch (error) {
    res.sendStatus(404);
  }
  res.sendStatus(404);

  // request(
  //   {
  //     url: "http://localhost:3001/address/?address=" + shorturl,
  //     method: "GET",
  //     json: true
  //   },
  //   function(error, response, body) {
  //     console.log({ error: error, response: response, body: body });
  //     res.send(response);
  //   }
  // );

  // const requestOptions = {
  //   uri: "http://localhost:3001/address/?address=" + shorturl,
  //   method: "GET",
  //   json: true
  // };
  // requestPromises = [];
  // requestPromises.push(rp(requestOptions));
  // await Promise.all(requestPromises).then(redirection => {
  //   if (redirection) {
  //     return res.redirect(redirection.longUrl);
  //   }
  // });
  // return res.sendStatus(404);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
