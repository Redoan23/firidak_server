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
        'https://firidak.web.app'
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
        const registerCollection = client.db('banglesDB').collection('registerCollection')
        const pendingOrderCollection = client.db('banglesDB').collection('pendingOrderCollection')
        const pendingReviewCollection = client.db('banglesDB').collection('pendingReviewCollection')
        const reviewCollection = client.db('banglesDB').collection('reviewCollection')
        const ordersDoneCollection = client.db('banglesDB').collection('ordersDoneCollection')
        const extraInfoCollection = client.db('banglesDB').collection('extraInfoCollection')
        const notificationCollection = client.db('banglesDB').collection('notificationCollection')


        // TODO: need to make the discount calculation here 

        app.get('/bangles', async (req, res) => {
            const result = await banglesCollection.find().toArray()
            res.send(result)
        })
        app.post('/bangles', async (req, res) => {
            const data = req.body
            const discount = data?.discount
            const price = data?.price
            if (discount) {
                const finalPrice = price - (price * discount / 100)
                data.discountedPrice = parseInt(finalPrice)
            }
            const result = await banglesCollection.insertOne(data)
            res.send(result)
        })

        app.get('/bangles/itemDetails/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await banglesCollection.findOne(query)
            res.send(result)
        })

        // change stock status
        app.patch('/bangles/:id', async (req, res) => {
            const id = req.params.id
            const { status } = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    stockStatus: status
                }
            }
            const options = { upsert: true }
            const result = await banglesCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        // delete a bangle

        app.delete('/deleteBangles/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await banglesCollection.deleteOne(filter)
            res.send(result)
        })

        // find single user

        app.get('/userData/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            res.send(user)
        })

        // get all user

        app.get('/allUser', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        // save user info
        app.post('/emailPassword/users', async (req, res) => {
            const { name, email } = req.body
            const role = 'normalUser'
            const data = { name, email, role }
            const query = { email: email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.status(409).send({ message: 'An account with this email already exists' })
            }
            const info = { name }
            const updateRegisterUser = await registerCollection.insertOne(info)
            const result = await userCollection.insertOne(data)
            res.send(result)
        })

        // get the total registered user
        app.get('/user/registered', async (req, res) => {
            const result = await registerCollection.find().toArray()
            res.send(result)
        })

        // modify user info
        app.patch('/user/updateRole/:email', async (req, res) => {
            const email = req?.params.email
            const { userRole } = req?.body
            const query = { email: email }
            const updatedDoc = {
                $set: { role: userRole }
            }
            const result = await userCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        app.delete('/user/delete/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // user order data
        app.post('/user/orderItems', async (req, res) => {
            const data = req.body
            console.log(data)
            const name = data?.name
            const orders = data?.orders
            const orderDate = data?.orderDate
            const notificationData = { name, orders, orderDate }
            const insertNotification = await notificationCollection.insertOne(notificationData)
            const result = await pendingOrderCollection.insertOne(data)
            res.send(result)
        })

        // get PendingOrders
        app.get('/pendingOrders', async (req, res) => {
            const result = await pendingOrderCollection.find().toArray()
            res.send(result)
        })


        // order acception
        app.post('/acceptOrder/:id', async (req, res) => {
            const id = req.params.id
            const data = req.body
            const filter = { _id: new ObjectId(id) }
            const removeFromPending = await pendingOrderCollection.deleteOne(filter)
            if (removeFromPending) {
                const result = await ordersDoneCollection.insertOne(data)
                res.send(result)
            }
        })

        // delete pending order
        app.delete('/deleteOrder/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await pendingOrderCollection.deleteOne(filter)
            res.send(result)
        })


        // get order lis from ordersDone collection
        app.get('/ordersDone', async (req, res) => {
            const result = await ordersDoneCollection.find().toArray()
            res.send(result)
        })

        // delete from orders done collection

        app.delete('/deleteAcceptedOrder/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: id } //as it is saves the data without giving any new ObjectId, so this needs to be found only with _id, check database for clearance
            const result = ordersDoneCollection.deleteOne(filter)
            res.send(result)
        })


        // set extra info

        app.put('/extraInfo', async (req, res) => {
            const data = req.body
            const updatedDoc = {
                $set: {}
            };

            if (data.courierFee) {
                updatedDoc.$set.courierFee = parseInt(data.courierFee);
            }

            if (data.homeDeliveryFee) {
                updatedDoc.$set.homeDeliveryFee = parseInt(data.homeDeliveryFee);
            }
            const options = { upsert: true }
            const filter = { name: data?.name }
            const result = await extraInfoCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        // get extra info data

        app.get('/extraInfoData', async (req, res) => {
            const result = await extraInfoCollection.find().toArray()
            res.send(result)
        })

        // get notification Data

        app.get('/notificationData', async (req, res) => {
            const result = await notificationCollection.find().toArray()
            res.send(result)
        })

        // delete notification
        app.delete('/deleteNotification/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await notificationCollection.deleteOne(filter)
            res.send(result)
        })


        // delete all notification

        app.delete('/deleteAllNotification', async (req, res) => {
            const result = await notificationCollection.deleteMany()
            res.send(result)
        })


        // review pending

        app.post('/pendingReview', async (req, res) => {
            const data = req.body
            const result = await pendingReviewCollection.insertOne(data)
            res.send(result)
        })

        // get pending review

        app.get('/pendingReviews', async (req, res) => {
            const result = await pendingReviewCollection.find().toArray()
            res.send(result)
        })

        // accept review

        app.post('/acceptedReview/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const data = req.body
            const deleteFromPending = await pendingReviewCollection.deleteOne(filter)
            const insertReview = await reviewCollection.insertOne(data)
            res.send(insertReview)
        })

        // delete review
        app.delete('/deleteReview/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await pendingReviewCollection.deleteOne(query)
            res.send(result)
        })

        // get review
        app.get('/review/:id', async (req, res) => {
            const itemId = req.params.id
            const query = { itemId: itemId }
            const result = await reviewCollection.find(query).toArray()
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
    console.log(`listening on the port ${port}`)
})
