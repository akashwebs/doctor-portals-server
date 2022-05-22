const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express()

app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eoi0a.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unathuraization error' })
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRATE, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

}

async function run() {
    try {
        await client.connect();

        const serviceCollection = client.db('doctor_portal').collection('services')
        const bookingCollection = client.db('doctor_portal').collection('booking')
        const userCollection = client.db('doctor_portal').collection('user')
        const doctorCollection = client.db('doctor_portal').collection('doctor')
        // verify admin 
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const requisterRole = await userCollection.findOne({ email: decodedEmail });
            if (requisterRole.role === 'admin') {
                next()
            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        }

        // get all appoinment services data
        app.get('/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query).project({ name: 1 })
            const result = await cursor.toArray()
            res.send(result);
        })
        // get booking info for dashboard
        app.get('/booking', verifyJwt, async (req, res) => {
            const patient = req.query.patient;
            const decodedEmail = req.decoded.email;

            if (decodedEmail !== patient) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { patient: patient };
            const result = await bookingCollection.find(query).toArray()
            res.send(result);
        })

        // post appoinment booking
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query)

            if (exists) {
                return res.send({ success: false, exists })
            }
            const result = await bookingCollection.insertOne(booking)
            res.send({ success: true, result });
        })
        // add doctor info in database from , add doctor
        app.post('/doctor', verifyJwt, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result)

        })
        // get user 
        app.get('/users', verifyJwt, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result);
        })
        // for check role  and sohw user route
        app.get('/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user?.role === 'admin'
            res.send({ admin: isAdmin })
        })

        // get doctor data
        app.get('/doctor',verifyJwt,verifyAdmin,async(req,res)=>{
            const doctors=await doctorCollection.find().toArray();
            res.send(doctors)
                    
        })
        app.delete('/doctor/:email',verifyJwt,verifyAdmin,async(req,res)=>{
            const email=req.params.email;
            const filter=({email: email})
            const result=await doctorCollection.deleteOne(filter)
            res.send(result)
                    
        })
        // make admin

        app.put('/user/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send({ result });
        })

        // put user in database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRATE, { expiresIn: '1h' })
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            res.send({ result, token });
        })


        // get all  available services
        app.get('/available', async (req, res) => {
            // step1: get all booking
            const date = req.query.date;
            const services = await serviceCollection.find().toArray()
            // step2: get the booking of the day
            const query = { date: date }
            const booking = await bookingCollection.find(query).toArray()

            // step 3: for each service, find bookings for tthat service


            services.forEach(service => {
                const serviceBooking = booking.filter(b => b.treatment === service.name);
                const booked = serviceBooking.map(s => s.slot);
                const available = service.slots.filter(slot => !booked.includes(slot))
                service.available = available;
            })

            res.send(services);
        })
    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('doctorl portals running');
})

app.listen(port, () => {
    console.log('successfully run doctor portal', port);
})

