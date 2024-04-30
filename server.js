const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const verifyToken = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
app.disable('x-powered-by');

// Connection URI
const url = 'mongodb+srv://ajaykumardrb:BXFljrgrnMqGDVRj@goldratecalculator.3twdz5b.mongodb.net/?retryWrites=true&w=majority&appName=GoldRateCalculator'
const dbName = 'GoldRateCalculator';

// Registration endpoint
app.post('/registerUser', async (req, res) => {
  const client = new MongoClient(url);
  try {
    const {name, email, password} = req.body;    
    console.log("Received registration request for:", email, name, password);
    await client.connect();
    const db = client.db(dbName);
    const UsersCollection = db.collection('Users');
    const existingUser = await UsersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    await UsersCollection.insertOne({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: 'Error registering user' });
  } finally {
    await client.close();
  }
});

// Login endpoint
app.post('/loginUser', async (req, res) => {
  const client = new MongoClient(url);
  try {
    const { email, password } = req.body;
    console.log("Received login request for:", email);
    await client.connect();
    const db = client.db(dbName);
    const UsersCollection = db.collection('Users');
    const user = await UsersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });
    // Now that user is authenticated, you can set the token in headers
    req.headers['authorization'] = token;
    
    res.status(200).json({ message: 'Login successful', userId: user._id, token });
    console.log({ message: 'Login Successful' })
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: 'Error logging in' });
  } finally {
    await client.close();
  }
});

//Logout User endpoint
app.post('/logout', (req, res) => {
  // Clear the authorization header
  res.setHeader('Authorization', '');
  res.status(200).json({ message: 'Logout successful' });
});

// Gold rate endpoint
const goldApiBaseUrl = "https://www.goldapi.io/api/XAU/";
const goldApiToken = "goldapi-hew45sluieg3l3-io";

app.get('/gold-rate/:currency', async (req, res) => {
  const currency = req.params.currency; // Extract the currency parameter from the request URL

  // Construct the complete URL with the currency parameter
  const goldApiUrl = `${goldApiBaseUrl}${currency}`;

  try {
    const response = await axios.get(goldApiUrl, {
      headers: {
        "x-access-token": goldApiToken,
        "Content-Type": "application/json"
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching gold rates:', error);
    res.status(500).json({ error: 'An error occurred while fetching gold rates.' });
  }
});

app.get('/', (req,res) => {
  res.send("server is running")
})
// Start the server
async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

}

startServer();
