const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const { LoginModel, TestModel, SchoolCodeModel, StudentLoginModel, ClassModel } = require('./config');

const app = express();
const port = 3000;

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
  StudentLoginModel.findOne({ name: req.body.username }).exec().then((s) => {
    if (s != null && hash(req.body.password) == s.password) {
      req.session.user = {
        username: req.body.username,
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
    if (!req.session.user) {
      return res.redirect('/studentlogin');
    }
    const classes = await ClassModel.find({ createdBy: req.session.user.username });
    res.render('studentdashboard', { classes: classes, username: req.session.user.username });
});

async function isValidClassCodeFunction(classCode) {
  const existingClass = await ClassModel.findOne({ className: classCode });
  
  if (existingClass) {
      return true;
  } else {
      return false;
  }
}

app.post('/joinclass', async (req, res) => {
  try {
      const classCode = req.body.classCode;

      const isValidClassCode = await isValidClassCodeFunction(classCode);

      console.log('Class code:', classCode);
      console.log('Is valid:', isValidClassCode);

      if (isValidClassCode) {
          const user = req.session.user;
          await ClassModel.create({ className: classCode, createdBy: user.username });

          return res.redirect('/studentdashboard');
      } else {
          return res.render('joinclass.ejs', { error: 'Invalid class code' });
      }
  } catch (error) {
      console.error('Error joining class:', error);
      return res.status(500).send('Internal Server Error');
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
      existingTest.questions = questions;
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions,
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
  const test = await TestModel.findOne({ _id: req.params.testid });
  res.render('formatted_test.ejs', { test: test });
});

app.post('/save_and_format_test', async (req, res) => {
  try {
    const { testName, questions } = req.body;
    const createdBy = req.session.user.username; // Get the username of the logged-in user

    let existingTest = await TestModel.findOne({ testName, createdBy });

    if (existingTest) {
      existingTest.questions = questions;
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions,
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

app.get('/:file', (req, res) => {
  res.render(req.params.file + '.ejs');
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