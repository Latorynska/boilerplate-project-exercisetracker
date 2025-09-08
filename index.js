const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let bodyParser = require('body-parser');
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

let exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
})

let User = mongoose.model("user", userSchema);
let Exercise = mongoose.model("exercise", exerciseSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users')
  .post(async (req, res) => {
    try {
      const { username } = req.body;
      let userDoc = await User.findOne({ username });
      if (!userDoc) {
        userDoc = new User({ username });
        await userDoc.save();
      }
      return res.json({
        username: userDoc.username,
        _id: userDoc._id
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e.message });
    }
  })
  .get((req, res) => {
    User.find({})
      .then(users => res.json(users))
      .catch(err => res.status(500).json({ error: err.message }));
  });

app.post('/api/users/:id/exercises', async (req, res) => {
  try {
    let { description, duration, date } = req.body;
    duration = Number(duration);
    date = date ? new Date(date) : new Date();
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    let userDoc = await User.findById(req.params.id);
    let newExercise = new Exercise({ description, duration, date, username: userDoc.username });
    await newExercise.save();

    return res.json({
      _id: userDoc._id,
      username: userDoc.username,
      description,
      duration,
      date: date.toDateString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id/logs', async (req, res) => {
  let { from, to, limit } = req.query;
  try {
    let userDoc = await User.findById(req.params.id);
    let query = { username: userDoc.username };
    if (from) {
      query.date = { ...query.date, $gte: new Date(from) }; // get the data from that date if 'from' query exist
    }
    if (to) {
      query.date = { ...query.date, $lte: new Date(to) }; // get the data up to that date if 'to' query exist
    }
    let limit = req.query.limit ? parseInt(req.query.limit) : 0;
    let exercises = await Exercise.find(query).limit(limit);
    let log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: new Date(ex.date).toDateString()
    }));
    return res.json({
      username: userDoc.username,
      count: exercises.length,
      _id: userDoc._id,
      log: log
    })
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
