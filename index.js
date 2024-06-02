const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 8000;

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wamxmmb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.use(express.json());

async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB");

        const bannerCollection = client.db('jollyHouse').collection('bannerCollection');
        const agreementCollection = client.db('jollyHouse').collection('agreement');
        const apertmentCollection = client.db('jollyHouse').collection('apertmentDB');
        const usersCollection = client.db('jollyHouse').collection('users');

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token); // Log only the token
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

        // -----------------------------------------
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });



        app.put('/user', async (req, res) => {
            const user = req.body;

            const query = { email: user?.email };
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



        app.patch('/users/update/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email };
            const updateDoc = {
                $set: { ...user, timestamp: Date.now() },
            };
            const result = await usersCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // -----------------------------------------

        app.get('/banners', async (req, res) => {
            const cursor = bannerCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/apartments', async (req, res) => {
            const cursor = apertmentCollection.find();
            const result = await cursor.toArray();
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
                res.send({ success: false, message: 'You have already applied for an apertmentDB agreement.' });
            } else {
                const result = await agreementCollection.insertOne(agreementItem);
                res.send({ success: true, result });
            }
        });

        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({ success: true });
                console.log('Logout successful');
            } catch (err) {
                res.status(500).send(err);
            }
        });

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
    }
}

run().catch(console.dir);