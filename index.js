const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 8000;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "https://assignment12jollyhome.netlify.app",
            "https://api.imgbb.com/1/upload?key=19c9072b07556f7849d6dea75b7e834d"
        ],
        credentials: true
    })
);

app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wamxmmb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB");

        const bannerCollection = client.db('jollyHouse').collection('bannerCollection');
        const agreementCollection = client.db('jollyHouse').collection('agreement');
        const apartmentCollection = client.db('jollyHouse').collection('apertmentDB');
        const usersCollection = client.db('jollyHouse').collection('users');
        const couponsCollection = client.db('jollyHouse').collection('coupons');
        const anouncementCollection = client.db('jollyHouse').collection('announcements');
        const paymentCollection = client.db("jollyHouse").collection("payments");

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            // console.log(token);
            res.send({ token });
        });

        const verifyToken = (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const user = await usersCollection.findOne({ email });
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };

        // Users Endpoints
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });

        app.patch('/users/:email', async (req, res) => {
            const { email } = req.params;
            const { role, ids, userEmail, userName, floorNo, blockName, apartmentNo, rent, agreementAcceptDate } = req.body;

            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role,
                    ids,
                    userEmail,
                    userName,
                    floorNo,
                    blockName,
                    apartmentNo,
                    rent,
                    agreementAcceptDate
                },
            };

            try {
                const result = await usersCollection.updateOne(filter, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'User not found' });
                }

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: 'No changes made to the user' });
                }

                res.send({ message: 'User updated successfully', result });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to update user' });
            }
        });


        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email, name: user.displayName };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                if (user.status === 'Requested') {
                    const result = await usersCollection.updateOne(query, {
                        $set: { status: user?.status },
                    });
                    return res.send(result);
                } else {
                    return res.send(isExist);
                }
            }

            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...user,
                    timestamp: Date.now(),
                },
            };
            const result = await usersCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });



        // Banners Endpoints
        app.get('/banners', async (req, res) => {
            const banners = await bannerCollection.find().toArray();
            res.send(banners);
        });

        // Announcement Endpoints
        app.get('/announcement', async (req, res) => {
            const users = await anouncementCollection.find().toArray();
            res.send(users);
        });







        app.patch('/announcements/:id', async (req, res) => {
            const { id } = req.params;
            const announce = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: announce.status
                },
            };
            try {
                const result = await anouncementCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: 'announce not found' });
                }
                res.send({ acknowledged: true });
            } catch (error) {
                console.error('Error updating announce:', error);
                res.status(500).send({ message: 'Failed to update announce' });
            }
        });

        app.post('/announcement', async (req, res) => {
            const announce = req.body;
            const result = await anouncementCollection.insertOne(announce);
            res.send(result);
        });


        // Coupons Endpoints
        app.get('/coupons', async (req, res) => {
            const coupons = await couponsCollection.find().toArray();
            res.send(coupons);
        });



        app.patch('/coupons/:id', async (req, res) => {
            const { id } = req.params;
            const coupon = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    code: coupon.code,
                    discount: coupon.discount,
                    description: coupon.description,
                },
            };
            try {
                const result = await couponsCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: 'Coupon not found' });
                }
                res.send({ acknowledged: true });
            } catch (error) {
                console.error('Error updating coupon:', error);
                res.status(500).send({ message: 'Failed to update coupon' });
            }
        });

        app.post('/coupons', async (req, res) => {
            const coupon = req.body;
            const result = await couponsCollection.insertOne(coupon);
            res.send(result);
        });

        app.delete('/coupons/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await couponsCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/coupons/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const coupon = await couponsCollection.findOne(query);
            res.send(coupon);
        });

        // Apartments Endpoints
        app.get('/apartments', async (req, res) => {
            const apartments = await apartmentCollection.find().toArray();
            res.send(apartments);
        });


        app.get('/apartments/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const apertment = await apartmentCollection.findOne(query);
            res.send(apertment);
        });

        app.patch('/apartments/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { status },
            };
            try {
                const result = await apartmentCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: 'Failed to update apartment status' });
            }
        });

        // Agreement Endpoints
        app.get('/agreement', async (req, res) => {
            const agreements = await agreementCollection.find().toArray();
            res.send(agreements);
        });



        app.delete('/agreement/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await agreementCollection.deleteOne(query);
            res.send(result);
        });



        app.get('/agreement/:email', async (req, res) => {
            const email = req.params.email;
            const agreement = await agreementCollection.findOne({ userEmail: email });
            res.send({ agreement });
        });

        app.post('/agreement', async (req, res) => {
            const agreementItem = req.body;
            const existingAgreement = await agreementCollection.findOne({ userEmail: agreementItem.userEmail });
            if (existingAgreement) {
                res.send({ success: false, message: 'You have already applied for an apartment agreement.' });
            } else {
                const result = await agreementCollection.insertOne(agreementItem);
                res.send({ success: true, result });
            }
        });

        // Logout Endpoint
        app.get('/logout', async (req, res) => {
            try {
                res.clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                }).send({ success: true });
                // console.log('Logout successful');
            } catch (err) {
                res.status(500).send(err);
            }
        });

        // =====================================================================

        // Payment related API
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = Math.round(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        app.get('/payments', async (req, res) => {
            const agreements = await paymentCollection.find().toArray();
            res.send(agreements);
        });


        app.get('/payments/:email', async (req, res) => {
            const email = req.params.email;
            const result = await paymentCollection.find({ email }).toArray();
            res.send(result);
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);

            res.send({ result });
        });




        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } finally {
        // Ensure the client connection closes properly on exit
        process.on('SIGINT', async () => {
            // await client.close();
            // console.log("Disconnected from MongoDB!");
            // process.exit(0);
        });
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('JollyHome is sitting');
});