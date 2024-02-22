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

const StudentLoginSchema = new mongoose.Schema({
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
  correctAns: { 
    value: { type: String },
    index: { type: Number }
  }
});

const TestSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true,
  },
  questions: {
    type: [QuestionSchema],
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  }
});

const SchoolCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
});

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  classCode: {
    type: String,
    required: true,
    unique: true
  }
});

const StudentClassLinkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentLogin',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
});

const ExamAssignmentSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },
  examName: {
    type: String,
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
});


const ExamAssignmentModel = mongoose.model('ExamAssignment', ExamAssignmentSchema);

const ClassModel = mongoose.model('Class', classSchema);

const SchoolCodeModel = mongoose.model('SchoolCode', SchoolCodeSchema);

const StudentLoginModel = mongoose.model('StudentLogin', StudentLoginSchema);

const TestModel = connectTests.model('Test', TestSchema);

const StudentClassLinkModel = mongoose.model('StudentClassLink', StudentClassLinkSchema);

module.exports = {
  LoginModel,
  collection,
  TestModel,
  SchoolCodeModel,
  StudentLoginModel,
  ClassModel,
  ExamAssignmentModel,
  StudentClassLinkModel,
};