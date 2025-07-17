require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const app = express();
const mongoose = require('mongoose');
const Todo = require('../Todos');
const jwt = require('jsonwebtoken');
const User = require('../Users');

app.use(cors({
  origin: 'todo-front-end-27iq-git-master-zohaibs-projects-68f2b5f1.vercel.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true, 
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ Failed to connect to MongoDB Atlas');
  console.error('Error details:', err.message);
  console.error('Connection URI:', process.env.MONGO_URI ? '***** (hidden for security)' : 'undefined');
});

app.get('/todos', authenticateToken, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user.id });
    res.status(200).json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res)=>{
  res.send("Hello");
});

app.get('/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id); 
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(200).json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/todo', authenticateToken, async (req, res) => {
  try {
    const { description, completed } = req.body;
    const todo = new Todo({
      description,
      completed: completed || false,
      user: req.user.id
    });
    await todo.save();
    res.status(201).json(todo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.put('/todo/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, completed } = req.body;
    
    // First verify the todo belongs to the user
    const existingTodo = await Todo.findOne({ _id: id, user: req.user.id });
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      { description, completed },
      { new: true }
    );
    
    res.status(200).json(updatedTodo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);
    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(200).json({ message: 'Todo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/profile', authenticateToken, (req, res) => {
    res.json({ message: 'Protected route accessed successfully' });
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user; 
        next();
    });
}


const PORT = process.env.PORT || 4000;
module.exports = app;
