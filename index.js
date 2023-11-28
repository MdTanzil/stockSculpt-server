const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//middleware
const corsOptions = {
  origin: ["http://localhost:5173","https://stocksculpt.web.app"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization",
};

const stripe = require("stripe")(process.env.PAYMENT);

app.use(express.json());
app.use(cors(corsOptions));

// middlewares
const verifyToken = (req, res, next) => {
  // console.log('inside verify token', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
// sIuXK2PfxaUOAtYZ
//  StockSculpt

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const uri = "mongodb://0.0.0.0:27017";
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.vfbjj6s.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const usersCollection = client.db("stockSculpt").collection("users");
const shopsCollection = client.db("stockSculpt").collection("shops");
const productsCollection = client.db("stockSculpt").collection("products");
const salesCollection = client.db("stockSculpt").collection("sales");
const paymentCollection = client.db("stockSculpt").collection("payment");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// jwt  create token  for authentication
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "120h",
  });
  res.send({ token });
});

// user create
app.post("/users", async (req, res) => {
  const user = req.body;
  // console.log(user);
  const query = { email: user.email, name: user.name };
  const existingUser = await usersCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const result = await usersCollection.insertOne(user);
  res.send(result);
});

app.post("/shops", verifyToken, async (req, res) => {
  const data = req.body;

  const shopInsertResult = await shopsCollection.insertOne(data);
  const shopNameResponse = await shopsCollection.findOne({ email: data.email });
  const shopName = shopNameResponse.shopName;
  const shopId = shopInsertResult.insertedId;
  const filter = { email: data.shopOwnerEmail };
  const options = { upsert: false };
  const updateUser = {
    $set: {
      roll: "shopAdmin",
      shopId: shopId,
      shopLogo: data.shopLogo,
      shopName,
    },
  };
  // console.log(updateUser);

  const updateUserResult = await usersCollection.updateOne(
    filter,
    updateUser,
    options
  );

  res.send({ shopInsertResult, updateUserResult });
});

// add a new product

app.post("/products", verifyToken, async (req, res) => {
  const product = req.body;
  const email = product.email;

  const result = await productsCollection.insertOne(product);
  if (result.insertedId) {
    const shopLimitUpdate = await shopsCollection.findOneAndUpdate(
      { shopOwnerEmail: email },
      { $inc: { limit: -1 } },
      { returnDocument: "after" }
    );
    // console.log(shopLimitUpdate);
  }
  // console.log(result);
  res.send(result);
});

// single shop

app.get("/shop/:email", async (req, res) => {
  const email = req.params.email;
  if (!email) {
    const result = await usersCollection.find();

    res.send(result);
  } else {
    const result = await usersCollection.findOne({ email: email });

    res.send(result);
  }
});

app.get("/shops/:email", async (req, res) => {
  const email = req.params.email;
  console.log(email);
  if (!email) {
    const result = await shopsCollection.find();

    res.send(result);
  } else {
    const result = await shopsCollection.findOne({ shopOwnerEmail: email });
    // console.log(result);
    res.send(result);
  }
});

// get products
app.get("/products/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const id = req.query.id;
  // console.log(id);
  let result;
  if (id) {
    result = await productsCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  } else {
    result = await productsCollection.find({ email: email }).toArray();
    res.send(result);
  }
});

// update a product
app.put("/products/:id", verifyToken, async (req, res) => {
  // create a filter for a movie to update
  const id = req.params.id;
  const product = req.body;

  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      name: product.name,
      productImage: product.productImage,
      quantity: product.quantity,
      location: product.location,
      productCost: product.productCost,
      profitMargin: product.profitMargin,
      discount: product.discount,
      sellingPrice: product.sellingPrice,
    },
  };
  const result = await productsCollection.updateOne(filter, updateDoc, options);
  // console.log(result);
  res.send(result);
});

// delete a product
app.delete("/products/:productId", verifyToken, async (req, res) => {
  const id = req.params.productId;
  const product = await productsCollection.findOne({ _id: new ObjectId(id) });
  const shopId = product.shopId;
  await shopsCollection.updateOne(
    { _id: new ObjectId(shopId) },
    { $inc: { limit: 1 } }
  );
  const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

  res.send(result);
});

app.post("/sale", verifyToken, async (req, res) => {
  const products = req.body;
  const result = await salesCollection.insertOne(products);
  res.send(result);
});

// check out get
app.get("/sale/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  // console.log('hit');

  const result = await salesCollection
    .find({ email: email, order: false })
    .toArray();
  // console.log(result);
  res.send(result);
});

// get all sold products
app.get("/sales/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  // console.log('hit');

  const result = await salesCollection
    .find({ email: email, order: true })
    .toArray();
  // console.log(result);
  res.send(result);
});


app.post("/getpaid", async (req, res) => {
  // try {
  const productId = req.body.productId;
  const saleId = req.body.saleId;
  console.log(productId, saleId);
  const resp = await productsCollection.updateOne(
    { _id: new ObjectId(productId) },
    { $inc: { sellCount: 1, quantity: -1 } }
  );
  console.log("resp", resp);
  const resc = await salesCollection.updateOne(
    { _id: new ObjectId(saleId) },
    { $set: { order: true } }
  );
  console.log("resc", resc);
  res.send({ success: true });
  // } catch (error) {
  // res.send({'success': false})

  // }
});

app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  // console.log(amount, "amount inside the intent");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.post("/payments", async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);
  const ammount = payment.price;
  if (ammount == 10) {
    await shopsCollection.findOneAndUpdate(
      {
        shopOwnerEmail: payment.email,
      },
      {
        $inc: {
          limit: 200,
        },
      }
    );
  } else if (ammount == 20) {
    await shopsCollection.findOneAndUpdate(
      {
        shopOwnerEmail: payment.email,
      },
      {
        $inc: {
          limit: 450,
        },
      }
    );
  } else if (ammount == 50) {
    await shopsCollection.findOneAndUpdate(
      {
        shopOwnerEmail: payment.email,
      },
      {
        $inc: {
          limit: 150,
        },
      }
    );
  }

  //  carefully delete each item from the cart
  // console.log('payment info', payment);
  // const query = {
  //   _id: {
  //     $in: payment.cartIds.map(id => new ObjectId(id))
  //   }
  // };

  // const deleteResult = await cartCollection.deleteMany(query);
  console.log("hit ", paymentResult);
  res.send({ paymentResult });
});
