const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceKey.json");
require("dotenv").config()
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uri =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xgamuc1.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access. Token not found!",
    });
  }

  const token = authorization.split(" ")[1];
  try {
    await admin.auth().verifyIdToken(token);

    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access.",
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("movie-db");
    const movieCollection = db.collection("movies");

    app.get("/movies", async (req, res) => {
      const result = await movieCollection.find().toArray();
      res.send(result);
    });

    app.get("/movies/:id",verifyToken, async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      const result = await movieCollection.findOne({ _id: objectId });

      res.send({
        success: true,
        result,
      });
    });

    app.post("/movies", async (req, res) => {
      const data = req.body;
      // console.log(data)
      const result = await movieCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    app.put("/movies/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      // console.log(id)
      // console.log(data)
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };

      const result = await movieCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });

    app.get("/latest-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ releaseYear: "desc" })
        .limit(6)
        .toArray();

      console.log(result);

      res.send(result);
    });

    app.get("/my-movies", verifyToken, async(req, res) => {
      const email = req.query.email
      const result = await movieCollection.find({addedBy: email}).toArray()
      res.send(result)
    })

    

    app.delete("/movies/:id", async (req, res) => {
      const { id } = req.params;
      //    const objectId = new ObjectId(id)
      // const filter = {_id: objectId}
      const result = await movieCollection.deleteOne({ _id: new ObjectId(id) });

      res.send({
        success: true,
        result,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running..");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
