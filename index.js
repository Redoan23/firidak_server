const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000

app.use(express.json())
app.use(cors({
    credentials: [
        'http://localhost:5173',
    ]
}))

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7b9pa19.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const banglesCollection = client.db('banglesDB').collection('banglesCollection')
        const userCollection = client.db('banglesDB').collection('userCollection')


        app.get('/mongo', async (req, res) => {
            res.send('mongo success')
        })
        app.get('/bangles', async (req, res) => {
            const result = await banglesCollection.find().toArray()
            res.send(result)
        })
        app.get('/bangles/itemDetails/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await banglesCollection.findOne(query)
            res.send(result)
        })
        app.get('/allUser', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.post('/emailPassword/users', async (req, res) => {
            const { name, email } = req.body
            const role = 'normalUser'
            const data = { name, email, role }
            const query = { email: email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.status(409).send({ message: 'An account with this email already exists' })
            }
            const result = await userCollection.insertOne(data)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('listening to the firidak server')
})

app.listen(port, () => {
    console.log(`listening on the port${port}`)
})
