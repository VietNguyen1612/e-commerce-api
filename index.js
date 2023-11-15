const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 8000;
const cors = require('cors');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');

const db_pass = process.env.DB_PASS;
const db_name = process.env.DB_NAME;

mongoose.connect(`mongodb+srv://${db_name}:${db_pass}@cluster0.ysx3cqy.mongodb.net/`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to the Database successfully");
}).catch(err => {
    console.log("Error connecting to the database", err);
    process.exit();
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const User = require('./models/user');
const Order = require('./models/order');
const sendVerificationEmail = async (email, verificationToken) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'namvietnguyenn@gmail.com',
            pass: 'nvzeftrurbkqpyje'
        }
    })

    const mailOptions = {
        from: 'amazon.com',
        to: email,
        subject: 'Verify your email',
        text: `Click on the link to verify your email: https://e-commerce-api-fj3l.onrender.com/verify/${verificationToken}`
    }

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log('error sending verify email', error);
    }
}


app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({ name, email, password });
        newUser.verificationToken = crypto.randomBytes(20).toString('hex');
        await newUser.save();
        sendVerificationEmail(newUser.email, newUser.verificationToken);
        res.status(201).json({
            message:
                "Registration successful. Please check your email for verification.",
        });
    } catch (error) {
        res.status(500).json({ message: 'Registration failed' });
    }
});

app.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(404).json({ message: 'Invalid token' });
        }
        user.verified = true;
        user.verificationToken = undefined;
        await user.save();
        res.status(200).json({ message: 'User verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed' });
    }
});

const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString('hex');
    return secretKey;
}

const secretKey = generateSecretKey();

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, secretKey)
        res.status(200).json({ message: 'Login successful', token: token });
    } catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
});

//endpoint to store a new address to the backend
app.post("/addresses", async (req, res) => {
    try {
        const { userId, address } = req.body;

        //find the user by the Userid
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //add the new address to the user's addresses array
        user.addresses.push(address);

        //save the updated user in te backend
        await user.save();

        res.status(200).json({ message: "Address created Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error addding address" });
    }
});

//endpoint to get all the addresses of a particular user
app.get("/addresses/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const addresses = user.addresses;
        res.status(200).json({ addresses });
    } catch (error) {
        res.status(500).json({ message: "Error retrieveing the addresses" });
    }
});