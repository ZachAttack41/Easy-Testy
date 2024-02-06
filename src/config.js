const mongoose = require('mongoose');

const connectLogin = mongoose.connect('mongodb://localhost:27017/Login-tut', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

connectLogin
  .then(() => {
    console.log('Login Database connected Successfully');
  })
  .catch((e) => {
    console.log('Login Database cannot be connected');
    console.log(e);
  });

const LoginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const LoginModel = mongoose.model('Login', LoginSchema);

const collection = mongoose.model('users', LoginSchema);

const connectTests = mongoose.createConnection('mongodb://localhost:27017/Tests', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

connectTests.on('open', () => {
  console.log('Tests Database connected Successfully');
});

connectTests.on('error', (err) => {
  console.log('Tests Database cannot be connected');
  console.error(err);
});

const QuestionSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  answers: { type: [String] },
  correctAns: { type: String }
});

const TestSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true,
  },
  questions:
  {
    type: [QuestionSchema],
    required: true,
  },
});

const SchoolCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
});

const SchoolCodeModel = mongoose.model('SchoolCode', SchoolCodeSchema);

const TestModel = connectTests.model('Test', TestSchema);

module.exports = {
  LoginModel,
  collection,
  TestModel,
  SchoolCodeModel
};