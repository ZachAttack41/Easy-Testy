const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
//const { Configuration, OpenAIAPI } = require("openai");
const { LoginModel, TestModel, SchoolCodeModel } = require('./config');

//const config = require('./src/.config');

const app = express();
const port = 3000;

//const openaiConfig = new Configuration({
//  apiKey: config.openai.apiKey,
//});
//const openai = new OpenAIAPI(openaiConfig);

//app.post("/reword_questions", async (req, res) => {
 // try {
  //  const { questions } = req.body;

  //  const rewordedQuestions = [];

  //  for (const question of questions) {
  //    const response = await openai.createCompletion({
  //      engine: "text-davinci-003",
  //      prompt: `Please reword the following question:\n\n${question}`,
  //    });

   //   const rewordedQuestion = response.choices[0].text.trim();

   //   rewordedQuestions.push(rewordedQuestion);
   // }

   // res.json({ rewordedQuestions });
//  } catch (error) {
//    console.error('Error rewording questions:', error);
//    res.status(500).json({ error: 'Internal Server Error' });
//  }
// });


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

    if (schoolCode === 'LYBK') {
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
    const tests = await TestModel.find();
    res.render('dashboard', { tests: tests, username: req.session.user.username });
  } catch (error) {
    console.error('Error retrieving tests:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/save_test', async (req, res) => {
  try {
    const { testName, questions } = req.body;

    let existingTest = await TestModel.findOne({ testName });

    if (existingTest) {
      existingTest.questions = questions;
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions,
      });
      await newTest.save();
      res.status(200).json({ testId: newTest._id });
    }
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});

const puppeteer = require('puppeteer');

app.post('/generate_test_pdf', async (req, res) => {
    try {
        const updatedTestContent = req.body.updatedTestContent;

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent(updatedTestContent);

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        const pdfPath = path.join(__dirname, 'public', 'test_paper.pdf');
        fs.writeFileSync(pdfPath, pdfBuffer);

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=test_paper.pdf',
            'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
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

    let existingTest = await TestModel.findOne({ testName });

    if (existingTest) {
      existingTest.questions = questions;
      await existingTest.save();
      res.status(200).json({ testId: existingTest._id });
    } else {
      const newTest = new TestModel({
        testName: testName,
        questions: questions,
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