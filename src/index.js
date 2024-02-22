const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const { LoginModel, TestModel, SchoolCodeModel, StudentLoginModel, ClassModel, ExamAssignmentModel, StudentClassLinkModel, } = require('./config');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: '2866bb50-045f-4f10-a813-165d8844b024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: false,
    maxAge: 34560000000,
  }
})
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');


app.get('/views/createatest.ejs', (req, res) => {
  res.render('createatest');
});


app.post('/signup', async (req, res) => {
  try {
    const schoolCode = req.body.schoolCode;
    const username = req.body.username;
    const password = req.body.password;

    if (schoolCode === 'LYBK' || 'Admin' || 'TEST') {
      const existingUser = await LoginModel.findOne({ name: username });
      if (!existingUser) {
        const newUser = new LoginModel({ name: username, password: hash(password) });
        await newUser.save();
        res.status(200).redirect('/login');
      } else {
        res.status(400).send('User already exists');
      }
    } else {
      res.status(400).send('Invalid school code');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/studentsignup', async (req, res) => {
  try {
    const schoolCode = req.body.schoolCode;
    const username = req.body.username;
    const password = req.body.password;

    if (schoolCode === 'LYBK' || 'Admin' || 'TEST') {
      const existingUser = await StudentLoginModel.findOne({ name: username });
      if (!existingUser) {
        const newUser = new StudentLoginModel({ name: username, password: hash(password) });
        await newUser.save();
        res.status(200).redirect('/studentlogin');
      } else {
        res.status(400).send('User already exists');
      }
    } else {
      res.status(400).send('Invalid school code');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/login', (req, res) => {
  LoginModel.findOne({ name: req.body.username }).exec().then((s) => {
    if (s != null && hash(req.body.password) == s.password) {
      req.session.user = {
        username: req.body.username,
      };
      res.redirect('/dashboard');
    } else {
      res.status(500).send('Invalid username or password');
    }
  }).catch((error) => {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  });
});

app.post('/studentlogin', (req, res) => {
  StudentLoginModel.findOne({ name: req.body.username }).exec().then((student) => {
    if (student != null && hash(req.body.password) == student.password) {
      req.session.user = {
        username: req.body.username,
        _id: student._id 
            };
      res.redirect('/studentdashboard');
    } else {
      res.status(500).send('Invalid username or password');
    }
  }).catch((error) => {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  });
});

app.get('/', (req,res) => {
  res.redirect('/home');
})

app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.send(`Welcome, ${req.session.user.username}!`);
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.render('login.ejs');
  });
});

app.get('/dashboard', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const tests = await TestModel.find({ createdBy: req.session.user.username });
    res.render('dashboard', { tests: tests, username: req.session.user.username });
  } catch (error) {
    console.error('Error retrieving tests:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/studentdashboard', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/studentlogin');
    }

    const studentId = req.session.user._id;

    const studentClasses = await StudentClassLinkModel.find({ studentId }).populate('classId');

    console.log('Student Classes:', studentClasses); // Log studentClasses array

    const username = req.session.user.username;
    const userId = req.session.user._id;

    // Map the studentClasses array to include class ID, name, period, and grade
    const formattedClasses = studentClasses.map(item => ({
      classId: item.classId._id, // Include the class ID
      className: item.classId.className,
      period: item.classId.period,
      grade: item.classId.grade,
    }));

    console.log('Formatted Classes:', formattedClasses); // Log formattedClasses array

    res.render('studentdashboard', { classes: formattedClasses, username, userId });
  } catch (error) {
    console.error('Error retrieving student classes:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/joinclass', async (req, res) => {
  try {
    // Retrieve class code entered by the user
    const classCode = req.body.classCode;

    // Find the class with the matching class code
    const classData = await ClassModel.findOne({ classCode });

    // If class is found, check if the student has already joined
    if (classData) {
      // Get the student's ID from the session
      const studentId = req.session.user._id; // Assuming you have stored student ID in the session

      // Check if the student has already joined the class
      const existingLink = await StudentClassLinkModel.findOne({ studentId, classId: classData._id });

      // If the link already exists, display an error message
      if (existingLink) {
        return res.status(400).send('You have already joined this class');
      }

      // Create a new StudentClassLinkModel instance
      const studentClassLink = new StudentClassLinkModel({
        studentId: studentId,
        classId: classData._id
      });

      // Save the StudentClassLinkModel instance to the database
      await studentClassLink.save();

      // Redirect the user to the student dashboard or display a success message
      res.redirect('/studentdashboard');
    } else {
      // If no class is found with the provided code, display an error message
      res.status(404).send('Class not found');
    }
  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/studentclassview', async (req, res) => {
  try {
      // Validate if user is logged in
      if (!req.session.user) {
          return res.redirect('/studentlogin');
      }

      const userId = req.session.user._id;

      // Validate if userId is provided
      if (!userId) {
          return res.status(400).send('User ID is required');
      }

      // Find the student class link for the user
      const studentClassLink = await StudentClassLinkModel.findOne({ studentId: userId });

      // Check if studentClassLink exists
      if (!studentClassLink) {
          return res.status(404).send('Student class link not found');
      }

      const classId = studentClassLink.classId;

      // Find class data by classId
      const classData = await ClassModel.findOne({ _id: classId });

      // Check if classData exists
      if (!classData) {
          return res.status(404).send('Class not found');
      }

      // Fetch assigned exams for the class
      const assignedExams = await ExamAssignmentModel.find({ classId: classId });

      // Fetch testId for the assigned exam
      const testIds = assignedExams.map(exam => exam.examId);
      const tests = await TestModel.find({ _id: { $in: testIds } });
      const testIdMap = {};
      tests.forEach(test => {
          testIdMap[test._id] = test._id; // Assuming examId and testId are the same
      });

      // Render the studentclassview page with class data, assigned exams, and testId map
      res.render('studentclassview', { classData: classData, assignedExams: assignedExams, testIdMap: testIdMap, userId: userId });
  } catch (error) {
      console.error('Error retrieving class details:', error);
      res.status(500).send('Internal Server Error');
  }
});




app.get('/createnewclass', (req, res) => {
  res.render('createnewclass', { error: null });
});


app.post('/createclass', async (req, res) => {
  try {
    const { className, subject, grade, period, classCode } = req.body;
    const createdBy = req.session.user.username;

    let existingClass = await ClassModel.findOne({ className, createdBy });

    if (existingClass) {
      existingClass.subject = subject;
      existingClass.grade = grade;
      existingClass.period = period;
      existingClass.classCode = classCode;
      await existingClass.save();
    } else {
      const newClass = new ClassModel({
        className: className,
        subject: subject,
        grade: grade,
        period: period,
        classCode: classCode,
        createdBy: createdBy
      });
      await newClass.save();
    }

    res.redirect('/classes');
  } catch (error) {
    console.error('Error saving class:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});

app.get('/classes', async (req, res) => {
  try {
    const classes = await ClassModel.find({ createdBy: req.session.user.username });
    res.render('classes', { classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.post('/save_test', async (req, res) => {
  try {
    const { testName, questions } = req.body;
    const createdBy = req.session.user.username;

    let existingTest = await TestModel.findOne({ testName, createdBy });

    if (existingTest) {
      existingTest.questions = questions.map(question => ({
        ...question,
        correctAns: {
          value: question.correctAns,
          index: question.answers.indexOf(question.correctAns)
        }
      }));
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions.map(question => ({
          ...question,
          correctAns: {
            value: question.correctAns,
            index: question.answers.indexOf(question.correctAns)
          }
        })),
        createdBy: createdBy
      });
      await newTest.save();
      res.status(200).json({ testId: newTest._id });
    }
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on Port: ${port}`);
});

function hash(n) {
  return crypto.createHash('sha256').update(n).digest('base64');
}


app.get('/view_test/:testid', async (req,res) => {
  const test = await TestModel.findOne({_id: req.params.testid})
  res.render('view_test.ejs', {test: test})
})

app.post('/delete_test/:testid', async (req, res) => {
  try {
      await TestModel.findByIdAndDelete(req.params.testid);
      res.redirect('/dashboard');
  } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/delete_test/:testid', async (req, res) => {
  try {
      await TestModel.findByIdAndDelete(req.params.testid);
      res.redirect('/dashboard');
  } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/formatted_test/:testid', async (req, res) => {
  try {
    const test = await TestModel.findOne({ _id: req.params.testid });
    res.render('formatted_test', { test: test, testId: req.params.testid });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/save_and_format_test', async (req, res) => {
  try {
    const { testName, questions } = req.body;
    const createdBy = req.session.user.username;

    let existingTest = await TestModel.findOne({ testName, createdBy });

    if (existingTest) {
      existingTest.questions = questions.map(question => ({
        ...question,
        correctAns: {
          value: question.correctAns,
          index: question.answers.indexOf(question.correctAns)
        }
      }));
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions.map(question => ({
          ...question,
          correctAns: {
            value: question.correctAns,
            index: question.answers.indexOf(question.correctAns)
          }
        })),
        createdBy: createdBy
      });
      await newTest.save();
      res.status(200).json({ testId: newTest._id });
    }
  } catch (error) {
    console.error('Error saving and formatting test:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});

app.post('/delete_test/:testid', async (req, res) => {
  try {
      await TestModel.findByIdAndDelete(req.params.testid);
      res.redirect('/dashboard');
  } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).send('Internal Server Error');
  }
});


app.get('/view_class/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;
    const classData = await ClassModel.findOne({ _id: classId });

    if (!classData) {
      return res.status(404).send('Class not found');
    }

    const assignedExams = await ExamAssignmentModel.find({ classId: classId });

    res.render('view_class.ejs', { classData: classData, assignedExams: assignedExams });
  } catch (error) {
    console.error('Error viewing class:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});


app.post('/delete_class/:classId', async (req, res) => {
  try {
    await ClassModel.findByIdAndDelete(req.params.classId);
    res.redirect('/classes');
} catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).send('Internal Server Error');
}
});

app.get('/assignexam/:classId', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const classId = req.params.classId;
    const classData = await ClassModel.findOne({ _id: classId });

    const tests = await TestModel.find({ createdBy: req.session.user.username });
    
    res.render('assignexam', { tests: tests, classId: classId, classData: classData }); 
  } catch (error) {
    console.error('Error retrieving tests:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/examdetails/:testid/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;
    const testId = req.params.testid;

    const classData = await ClassModel.findOne({ _id: classId });
    if (!classData) {
      return res.status(404).send('Class not found');
    }

    const test = await TestModel.findOne({ _id: testId });
    if (!test) {
      return res.status(404).send('Test not found');
    }

    res.render('examdetails', { test: test, classData: classData, classId: classId, testid: testId });
  } catch (error) {
    console.error('Error retrieving exam details:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/confirmassign/:testid/:classId', async (req, res) => {
  try {
    const examId = req.params.testid;
    const classId = req.params.classId;
    const { startTime, endTime } = req.body;

    if (!examId || !classId || !startTime || !endTime) {
      return res.status(400).send('Missing required fields');
    }

    const test = await TestModel.findById(examId);
    if (!test) {
      return res.status(404).send('Exam not found');
    }
    const examName = test.testName;

    const assignment = new ExamAssignmentModel({
      examId: examId,
      examName: examName,
      classId: classId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });

    await assignment.save();

    res.redirect(`/view_class/${classId}`);
  } catch (error) {
    console.error('Error assigning exam:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/leaveclass', async (req, res) => {
  try {
    const { classId, userId } = req.body;

    // Validate if classId and userId are provided
    if (!classId || !userId) {
      return res.status(400).send('Class ID and User ID are required');
    }

    // Delete the corresponding entry in the StudentClassLink collection
    await StudentClassLinkModel.deleteOne({ classId, studentId: userId });

    res.redirect('/studentdashboard');
  } catch (error) {
    console.error('Error leaving class:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/starttest/:examId', async (req, res) => {
  try {
    // Fetch the exam by its ID
    const exam = await ExamAssignmentModel.findById(req.params.examId);
    if (!exam) {
      return res.status(404).send('Exam not found');
    }

    // Fetch the corresponding test using the examId
    const test = await TestModel.findById(exam.examId);
    if (!test) {
      return res.status(404).send('Test not found for the given exam');
    }

    // Render the starttest view, passing the exam and the associated test to it
    res.render('starttest', { exam: exam, test: test });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/testing/:testId', async (req, res) => {
  try {
      const test = await TestModel.findById(req.params.testId);
      if (!test) {
          return res.status(404).send('Test not found');
      }
      console.log('Test:', test); // Log the test object
      console.log('Number of questions:', test.questions.length); // Log the number of questions
      res.render('testing', { test: test });
  } catch (error) {
      console.error('Error fetching test:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/viewanswerkey', async function(req, res) {
  try {
      const testId = req.query.testId;
      console.log('Received testId:', testId);
      const test = await TestModel.findById(testId).exec();
      console.log('Fetched test:', test);

      if (!test) {
          console.error('Test not found');
          return res.status(404).send('Test not found');
      }

      // Map through each question in the test and extract the correct answer choice
      const correctAnswers = test.questions.map(question => {
          const correctIndex = question.correctAns.index; // Get the index of the correct answer
          const answerChoice = String.fromCharCode(65 + correctIndex); // Convert index to ASCII character (A, B, C, D, E)
          return answerChoice;
      });

      res.render('viewanswerkey', { test: test, correctAnswers: correctAnswers });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/:file', (req, res) => {
  const fileName = req.params.file + '.ejs';
  res.render(fileName);
});



// function penissucker (loopCount) {
//   let i = 0;
//   while (i < loopCount) {
//     i += 1;
//   }
// }





















// function buttholelicker () {
//   for (let i = 0; i < 55; i += 2) {   
//   }
// }

// let x = [1, 2, "22", "penis"]

// console.log(x[3])

// this will print penis




// function balls () {
//   for (i = 0; i < 15; i ++) {
//   console.log(balls)
//   }
// }