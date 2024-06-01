const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://tonmoyahamed2009:tonmoytoma25@cluster0.wamxmmb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

async function run() {
    try {
        // await client.connect(); // Connect to MongoDB
        console.log("Connected to MongoDB");

        const bannerCollection = client.db('jollyHouse').collection('bannerCollection');
        const apertmentCollection = client.db('jollyHouse').collection('apertmentCollection');

        // Generate JWT token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // Middleware to verify JWT token
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

        // Middleware to verify admin role
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const userCollection = client.db('jollyHouse').collection('userCollection');
            const user = await userCollection.findOne({ email });
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };


        app.get('/banners', async (req, res) => {

            const cursor = bannerCollection.find();
            const result = await cursor.toArray();
            res.send(result);

        });

        app.get('/apertment', async (req, res) => {

            const cursor = apertmentCollection.find();
            const result = await cursor.toArray();
            res.send(result);

        });





        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
    }
}

run().catch(console.dir);
