const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const app=express()

app.use(cors())
app.use(express.json())
const port=process.env.PORT || 5000;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eoi0a.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();

        const serviceCollection=client.db('doctor_portal').collection('services')
        const bookingCollection=client.db('doctor_portal').collection('booking')
        // get all appoinment services data
        app.get('/services',async(req,res)=>{
          const query={}
          const cursor=serviceCollection.find(query)
          const result=await cursor.toArray()
          res.send(result);
        })

        // post appoinment booking
        app.post('/booking',async (req,res)=>{
            const booking=req.body;
            const query={treatment:booking.treatment, date:booking.date,patient:booking.patient}
            const exists=await bookingCollection.findOne(query)
           
            if(exists){
                return res.send({success:false, exists})
            }
            const result=await bookingCollection.insertOne(booking)
            res.send({success:true,result});
        })

    }
    finally{

    }
}
run().catch(console.dir)

app.get('/',(req,res)=>{
    res.send('doctorl portals running');
})

app.listen(port, ()=>{
    console.log('successfully run doctor portal', port);
})

